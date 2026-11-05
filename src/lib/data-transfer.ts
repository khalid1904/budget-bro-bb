import { supabase } from '@/integrations/supabase/client';

export const EXPORT_FORMAT_VERSION = 1;

const DATA_TABLES = [
  'transactions',
  'expenses',
  'other_budgets',
  'other_budget_transactions',
  'loans',
  'loan_recoveries',
  'savings_goals',
  'recurring_rules',
  'custom_categories',
] as const;

const SETTINGS_FIELDS = [
  'default_currency',
  'dark_mode',
  'expense_tracking_enabled',
  'cross_budget_transfers_enabled',
  'lending_enabled',
  'bill_scan_enabled',
] as const;

const PROFILE_FIELDS = ['username', 'avatar', 'bio'] as const;

// Children first so linked rows (loan links, budget links, transfer pairs,
// expense -> transaction) are never left pointing at rows that still exist
// while their owner rows are being removed.
const WIPE_ORDER = [
  'loan_recoveries',
  'loans',
  'expenses',
  'other_budget_transactions',
  'transactions',
  'savings_goals',
  'recurring_rules',
  'custom_categories',
  'other_budgets',
] as const;

// Parents first so foreign keys stay valid during the inserts.
const INSERT_ORDER = [
  'other_budgets',
  'savings_goals',
  'recurring_rules',
  'custom_categories',
  'transactions',
  'other_budget_transactions',
  'expenses',
  'loans',
  'loan_recoveries',
] as const;

const CHUNK_SIZE = 200;

export interface ExportFile {
  app: 'budget-bro';
  format: number;
  exportedAt: string;
  data: {
    [K in (typeof DATA_TABLES)[number]]: any[];
  } & {
    user_settings?: Record<string, any>;
    profile?: Record<string, any>;
  };
}

async function requireUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('You need to be signed in to do this.');
  return user.id;
}

function pickFields(row: Record<string, any> | null, fields: readonly string[]): Record<string, any> {
  if (!row) return {};
  const out: Record<string, any> = {};
  for (const f of fields) out[f] = row[f];
  return out;
}

/** Gather every table the user owns plus their settings and display profile. */
export async function buildExport(): Promise<ExportFile> {
  const uid = await requireUserId();
  const data: ExportFile['data'] = {} as ExportFile['data'];

  for (const table of DATA_TABLES) {
    const { data: rows, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', uid);
    if (error) throw new Error(`Export failed while reading ${table}.`);
    (data as any)[table] = rows ?? [];
  }

  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', uid)
    .single();
  data.user_settings = pickFields(settings, SETTINGS_FIELDS);

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', uid)
    .single();
  data.profile = pickFields(profile, PROFILE_FIELDS);

  return {
    app: 'budget-bro',
    format: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

/** Trigger a browser download of the export JSON. */
export function downloadExport(exportData: ExportFile, filename: string) {
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Read and validate an export file chosen by the user. */
export async function parseImportFile(file: File): Promise<ExportFile> {
  let parsed: any;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("That file isn't a valid Budget Bro export.");
  }
  if (parsed?.app !== 'budget-bro' || typeof parsed?.format !== 'number' || !parsed?.data) {
    throw new Error("That file isn't a Budget Bro export file.");
  }
  if (parsed.format > EXPORT_FORMAT_VERSION) {
    throw new Error('This export came from a newer app version. Update Budget Bro first.');
  }
  return parsed as ExportFile;
}

/**
 * Replace everything currently in the signed-in account with the export
 * file's data. Deletes first, then re-inserts with the original IDs and
 * cross-references so linked entries stay connected. The account's tier,
 * email and auth identity are never touched.
 */
export async function importAllData(
  exportFile: ExportFile,
  onProgress?: (message: string) => void,
): Promise<Record<string, number>> {
  const uid = await requireUserId();
  const counts: Record<string, number> = {};

  for (const table of WIPE_ORDER) {
    const { error } = await supabase.from(table).delete().eq('user_id', uid);
    if (error) throw new Error(`Import failed while clearing existing ${table}. Nothing was changed before this step.`);
  }

  for (const table of INSERT_ORDER) {
    const rows = (Array.isArray((exportFile.data as any)[table]) ? (exportFile.data as any)[table] : [])
      .map((row: Record<string, any>) => ({ ...row, user_id: uid }));

    counts[table] = rows.length;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase.from(table).insert(chunk as any);
      if (error) throw new Error(`Import stopped on ${table}: ${error.message}`);
    }
    onProgress?.(`Restored ${table.replace(/_/g, ' ')}…`);
  }

  const settings = pickFields(exportFile.data?.user_settings ?? {}, SETTINGS_FIELDS);
  if (Object.keys(settings).length) {
    await supabase.from('user_settings').update(settings).eq('user_id', uid);
  }
  const profile = pickFields(exportFile.data?.profile ?? {}, PROFILE_FIELDS);
  if (profile.username || profile.avatar || profile.bio) {
    await supabase.from('profiles').update(profile).eq('user_id', uid);
  }

  return counts;
}
