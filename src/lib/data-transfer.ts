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

function pickFields<K extends string>(row: Record<string, any> | null, fields: readonly K[]): Partial<Record<K, any>> {
  if (!row) return {};
  const out: Partial<Record<K, any>> = {};
  for (const f of fields) {
    if (row[f] !== undefined) out[f] = row[f];
  }
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

type DataTable = (typeof DATA_TABLES)[number];

const REFERENCES: Partial<Record<DataTable, Record<string, DataTable>>> = {
  transactions: { goal_id: 'savings_goals', recurring_rule_id: 'recurring_rules', transfer_ref_id: 'other_budget_transactions' },
  other_budget_transactions: { other_budget_id: 'other_budgets', goal_id: 'savings_goals', transfer_ref_id: 'transactions' },
  expenses: { budget_transaction_id: 'transactions' },
  loans: { linked_transaction_id: 'transactions', linked_other_budget_txn_id: 'other_budget_transactions' },
  loan_recoveries: { loan_id: 'loans', linked_transaction_id: 'transactions', linked_other_budget_txn_id: 'other_budget_transactions' },
};

function isRecord(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateExport(parsed: unknown): asserts parsed is ExportFile {
  if (!isRecord(parsed) || parsed.app !== 'budget-bro' || !isRecord(parsed.data)) {
    throw new Error("That file isn't a Budget Bro export file.");
  }
  if (typeof parsed.format === 'number' && parsed.format > EXPORT_FORMAT_VERSION) {
    throw new Error('This export came from a newer app version. Update Budget Bro first.');
  }
  if (parsed.format !== EXPORT_FORMAT_VERSION) throw new Error('Unsupported export format.');
  for (const table of DATA_TABLES) {
    if (!Array.isArray(parsed.data[table])) throw new Error(`Invalid export: missing or invalid ${table}.`);
    const ids = new Set<string>();
    for (const row of parsed.data[table]) {
      if (!isRecord(row) || typeof row.id !== 'string' || !row.id || ids.has(row.id)) {
        throw new Error(`Invalid export: invalid or duplicate record ID in ${table}.`);
      }
      ids.add(row.id);
    }
  }
  for (const key of ['profile', 'user_settings']) {
    if (parsed.data[key] !== undefined && !isRecord(parsed.data[key])) {
      throw new Error(`Invalid export: invalid ${key}.`);
    }
  }
}

/** Prepare the entire record graph before making any destructive requests. */
export function prepareImportData(exportFile: ExportFile, uid: string): ExportFile['data'] {
  validateExport(exportFile);
  const ids = Object.fromEntries(DATA_TABLES.map(table => [
    table, new Map(exportFile.data[table].map(row => [row.id, crypto.randomUUID()])),
  ])) as Record<DataTable, Map<string, string>>;
  const data = { ...exportFile.data };
  for (const table of DATA_TABLES) {
    data[table] = exportFile.data[table].map(row => {
      const copy = { ...row, id: ids[table].get(row.id), user_id: uid };
      for (const [field, target] of Object.entries(REFERENCES[table] ?? {})) {
        const value = row[field];
        if (value == null) {
          if (field === 'other_budget_id' || field === 'loan_id') {
            throw new Error(`Invalid export: missing ${table}.${field}.`);
          }
          continue;
        }
        const replacement = ids[target].get(value);
        if (!replacement) throw new Error(`Invalid export: ${table}.${field} points to a missing ${target} record.`);
        copy[field] = replacement;
      }
      return copy;
    });
  }
  return data;
}

/** Read and validate an export file chosen by the user. */
export async function parseImportFile(file: File): Promise<ExportFile> {
  let parsed: any;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("That file isn't a valid Budget Bro export.");
  }
  validateExport(parsed);
  return parsed as ExportFile;
}

/**
 * Replace everything currently in the signed-in account with the export
 * file's data. Assigns fresh IDs and remaps cross-references before deleting
 * existing data, so imports into another account cannot collide with the source. The account's tier,
 * email and auth identity are never touched.
 */
export async function importAllData(
  exportFile: ExportFile,
  onProgress?: (message: string) => void,
): Promise<Record<string, number>> {
  const uid = await requireUserId();
  const data = prepareImportData(exportFile, uid);
  const counts: Record<string, number> = {};

  for (const table of WIPE_ORDER) {
    const { error } = await supabase.from(table).delete().eq('user_id', uid);
    if (error) throw new Error(`Import failed while clearing ${table}: ${error.message}. Earlier steps may have changed data; keep your export file to retry.`);
  }

  for (const table of INSERT_ORDER) {
    const rows = data[table];

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
    const { error } = await supabase.from('user_settings').update(settings).eq('user_id', uid);
    if (error) throw new Error(`Import stopped on settings: ${error.message}`);
  }
  const profile = pickFields(exportFile.data?.profile ?? {}, PROFILE_FIELDS);
  if (Object.keys(profile).length) {
    const { error } = await supabase.from('profiles').update(profile).eq('user_id', uid);
    if (error) throw new Error(`Import stopped on profile: ${error.message}`);
  }

  return counts;
}
