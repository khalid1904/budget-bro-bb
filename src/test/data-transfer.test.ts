import { beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';

// jsdom 20 does not implement randomUUID; use the actual Web Crypto API.
vi.stubGlobal('crypto', webcrypto);
import { importAllData, prepareImportData, type ExportFile } from '@/lib/data-transfer';

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from, auth: { getUser: async () => ({ data: { user: { id: 'destination' } }, error: null }) } },
}));

function backup(): ExportFile {
  return {
    app: 'budget-bro', format: 1, exportedAt: '2026-11-11',
    data: {
      transactions: [{ id: 'tx', user_id: 'source', goal_id: 'goal', recurring_rule_id: 'rule', transfer_ref_id: 'other-tx' }],
      expenses: [{ id: 'expense', budget_transaction_id: 'tx' }],
      other_budgets: [{ id: 'budget' }],
      other_budget_transactions: [{ id: 'other-tx', other_budget_id: 'budget', goal_id: 'goal', transfer_ref_id: 'tx' }],
      loans: [{ id: 'loan', linked_transaction_id: 'tx', linked_other_budget_txn_id: null }],
      loan_recoveries: [{ id: 'recovery', loan_id: 'loan', linked_other_budget_txn_id: 'other-tx' }],
      savings_goals: [{ id: 'goal' }], recurring_rules: [{ id: 'rule' }], custom_categories: [],
    },
  };
}

beforeEach(() => from.mockReset());

describe('account data import', () => {
  it('gives copied records new IDs and preserves the complete relationship graph', () => {
    const original = backup();
    const data = prepareImportData(original, 'destination');
    for (const [table, rows] of Object.entries(data)) {
      if (!Array.isArray(rows)) continue;
      rows.forEach((row, index) => {
        expect(row.id).not.toBe(original.data[table][index].id);
        expect(row.user_id).toBe('destination');
      });
    }
    const tx = data.transactions[0];
    const other = data.other_budget_transactions[0];
    expect(tx.goal_id).toBe(data.savings_goals[0].id);
    expect(tx.recurring_rule_id).toBe(data.recurring_rules[0].id);
    expect(tx.transfer_ref_id).toBe(other.id);
    expect(other.transfer_ref_id).toBe(tx.id);
    expect(other.goal_id).toBe(data.savings_goals[0].id);
    expect(other.other_budget_id).toBe(data.other_budgets[0].id);
    expect(data.expenses[0].budget_transaction_id).toBe(tx.id);
    expect(data.loans[0].linked_transaction_id).toBe(tx.id);
    expect(data.loans[0].linked_other_budget_txn_id).toBeNull();
    expect(data.loan_recoveries[0].loan_id).toBe(data.loans[0].id);
    expect(data.loan_recoveries[0].linked_other_budget_txn_id).toBe(other.id);
    expect(original).toEqual(backup());
  });

  it.each(['missing table', 'duplicate ID', 'broken reference'])('rejects %s before deleting account data', async (problem) => {
    const file = backup();
    if (problem === 'missing table') delete file.data.expenses;
    if (problem === 'duplicate ID') file.data.transactions.push({ ...file.data.transactions[0] });
    if (problem === 'broken reference') file.data.expenses[0].budget_transaction_id = 'missing';
    await expect(importAllData(file)).rejects.toThrow('Invalid export');
    expect(from).not.toHaveBeenCalled();
  });

  it('imports into another account while the source records still exist', async () => {
    const file = backup();
    const sourceIds = new Set(Object.values(file.data).flatMap(rows => Array.isArray(rows) ? rows.map(row => row.id) : []));
    const inserted: Record<string, any[]> = {};
    from.mockImplementation(table => ({
      delete: () => ({ eq: async (_column: string, uid: string) => {
        expect(uid).toBe('destination');
        return { error: null };
      } }),
      insert: async (rows: any[]) => {
        if (rows.some(row => sourceIds.has(row.id))) return { error: { message: 'duplicate key violates primary key' } };
        inserted[table] = rows;
        return { error: null };
      },
    }));
    const counts = await importAllData(file);
    expect(counts.transactions).toBe(1);
    expect(counts.loan_recoveries).toBe(1);
    expect(inserted.expenses[0].budget_transaction_id).toBe(inserted.transactions[0].id);
  });

  it('reports settings failures instead of reporting a successful import', async () => {
    const file = backup();
    file.data.user_settings = { dark_mode: true };
    from.mockImplementation(table => ({
      delete: () => ({ eq: async () => ({ error: null }) }),
      insert: async () => ({ error: null }),
      update: () => ({ eq: async () => ({ error: table === 'user_settings' ? { message: 'Permission denied' } : null }) }),
    }));
    await expect(importAllData(file)).rejects.toThrow('Import stopped on settings: Permission denied');
  });
});
