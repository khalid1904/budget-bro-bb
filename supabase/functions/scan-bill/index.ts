import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_BYTES = 5 * 1024 * 1024;

const BodySchema = z.object({
  image: z.string().min(32).max(9_000_000),
  mimeType: z.string().min(3).max(100),
  categories: z.array(z.string().min(1).max(60)).max(80).default([]),
  currency: z.string().min(1).max(10).optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(
      authHeader.replace('Bearer ', ''),
    );
    if (claimsError || !claimsData?.claims) return json({ error: 'Unauthorized' }, 401);

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) return json({ error: 'AI is not configured' }, 500);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { image, mimeType, categories, currency } = parsed.data;

    if (!ALLOWED_MIME.includes(mimeType)) {
      return json({ error: 'Unsupported file type. Upload a JPG, PNG, WEBP or PDF bill.' }, 400);
    }
    const base64 = image.includes(',') ? image.split(',')[1] : image;
    if ((base64.length * 3) / 4 > MAX_BYTES) {
      return json({ error: 'File is too large. Please upload a bill under 5MB.' }, 400);
    }
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const categoryLine = categories.length
      ? `Pick "category" from exactly one of this list (choose the closest match, otherwise "Other"): ${categories.join(', ')}.`
      : 'Set "category" to a short sensible expense category name.';

    const instruction = [
      'You read receipts and bills and extract a single expense entry.',
      'title: the merchant or shop name (short, max 60 chars). If unreadable, use a short description of the purchase.',
      'amount: the final total paid as a plain number (no currency symbol, no thousands separators). Use the grand total including tax.',
      `date: the bill date in YYYY-MM-DD format. If no date is visible, use ${new Date().toISOString().split('T')[0]}.`,
      categoryLine,
      'notes: a very short summary of the main line items (max 200 chars).',
      `currency: the ISO currency code shown on the bill, or "${currency ?? 'unknown'}" if none is visible.`,
      'confidence: 0 to 1, how confident you are in the extraction.',
      'If the image is not a bill or is unreadable, set amount to 0 and confidence to 0.',
    ].join('\n');

    const content = mimeType === 'application/pdf'
      ? [
          { type: 'input_text', text: instruction },
          { type: 'input_file', filename: 'bill.pdf', file_data: dataUrl },
        ]
      : [
          { type: 'input_text', text: instruction },
          { type: 'input_image', image_url: dataUrl },
        ];

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': lovableApiKey,
        'X-Lovable-AIG-SDK': 'fetch',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5.6-sol',
        stream: true,
        input: [{ role: 'user', content }],
        text: {
          format: {
            type: 'json_schema',
            name: 'bill_extraction',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                title: { type: 'string' },
                amount: { type: 'number' },
                date: { type: 'string' },
                category: { type: 'string' },
                notes: { type: 'string' },
                currency: { type: 'string' },
                confidence: { type: 'number' },
              },
              required: ['title', 'amount', 'date', 'category', 'notes', 'currency', 'confidence'],
            },
          },
        },
      }),
    });

    if (!aiRes.ok || !aiRes.body) {
      const detail = await aiRes.text().catch(() => '');
      if (aiRes.status === 429) return json({ error: 'Too many scans right now. Please try again in a moment.' }, 429);
      if (aiRes.status === 402) return json({ error: 'AI credits exhausted. Please add credits to continue scanning bills.' }, 402);
      console.error('AI gateway error', aiRes.status, detail);
      return json({ error: 'Could not read this bill. Please enter it manually.' }, 502);
    }

    // Read the SSE stream and accumulate the output text.
    const reader = aiRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let text = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const evt = JSON.parse(payload);
          if (evt.type === 'response.output_text.delta' && typeof evt.delta === 'string') {
            text += evt.delta;
          } else if (evt.type === 'response.completed' && typeof evt.response?.output_text === 'string' && !text) {
            text = evt.response.output_text;
          }
        } catch (_) { /* ignore partial frames */ }
      }
    }

    let extracted: Record<string, unknown> | null = null;
    try {
      extracted = JSON.parse(text.trim());
    } catch (_) {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) { try { extracted = JSON.parse(match[0]); } catch (_) { /* noop */ } }
    }

    if (!extracted) {
      return json({ error: 'Could not read this bill. Please enter it manually.' }, 422);
    }

    const amount = Number(extracted.amount);
    return json({
      title: String(extracted.title ?? '').slice(0, 80),
      amount: Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : 0,
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(extracted.date ?? ''))
        ? String(extracted.date)
        : new Date().toISOString().split('T')[0],
      category: String(extracted.category ?? ''),
      notes: String(extracted.notes ?? '').slice(0, 200),
      currency: String(extracted.currency ?? ''),
      confidence: Number(extracted.confidence) || 0,
    });
  } catch (err) {
    console.error('scan-bill failed', err);
    return json({ error: 'Something went wrong while scanning the bill.' }, 500);
  }
});
