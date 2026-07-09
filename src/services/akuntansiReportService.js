import { supabase } from '@/lib/supabase.js';

function ensureTenantId(tenantId) {
  if (!tenantId) throw new Error('tenantId wajib diisi');
}

function sumBy(rows, predicate) {
  return rows
    .filter(predicate)
    .reduce((acc, row) => acc + Number(row.balance || 0), 0);
}

function computeBalance(normalBalance, debit, credit) {
  if (String(normalBalance || '').toLowerCase() === 'credit') {
    return credit - debit;
  }
  return debit - credit;
}

export const akuntansiReportService = {
  async ensureCashflowDefaultMapping(tenantId) {
    ensureTenantId(tenantId);
    const { data: existing, error: existingErr } = await supabase
      .from('akuntansi_cashflow_account_map')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1);
    if (existingErr) throw existingErr;
    if (existing && existing.length > 0) return;

    const defaults = [
      { tenant_id: tenantId, account_type: 'income', cashflow_group: 'operating', is_active: true },
      { tenant_id: tenantId, account_type: 'expense', cashflow_group: 'operating', is_active: true },
      { tenant_id: tenantId, account_type: 'asset', cashflow_group: 'investing', is_active: true },
      { tenant_id: tenantId, account_type: 'liability', cashflow_group: 'financing', is_active: true },
      { tenant_id: tenantId, account_type: 'equity', cashflow_group: 'financing', is_active: true },
    ];
    const { error } = await supabase.from('akuntansi_cashflow_account_map').insert(defaults);
    if (error) throw error;
  },

  async getTrialBalance(tenantId, { dateFrom, dateTo } = {}) {
    ensureTenantId(tenantId);
    let query = supabase
      .from('akuntansi_journal_entry_lines')
      .select('debit, credit, account:account_id(id, code, name, account_type), journal:journal_entry_id(entry_date)')
      .eq('tenant_id', tenantId);

    if (dateFrom) query = query.gte('journal.entry_date', dateFrom);
    if (dateTo) query = query.lte('journal.entry_date', dateTo);

    const { data, error } = await query;
    if (error) throw error;

    const map = new Map();
    for (const row of data || []) {
      const account = row.account;
      if (!account?.id) continue;
      const current = map.get(account.id) || {
        account_id: account.id,
        code: account.code,
        name: account.name,
        account_type: account.account_type,
        normal_balance: account.normal_balance || 'debit',
        debit: 0,
        credit: 0,
      };
      current.debit += Number(row.debit || 0);
      current.credit += Number(row.credit || 0);
      current.balance = computeBalance(current.normal_balance, current.debit, current.credit);
      map.set(account.id, current);
    }
    return [...map.values()].sort((a, b) => String(a.code).localeCompare(String(b.code)));
  },

  async getSummary(tenantId, filters = {}) {
    const trial = await this.getTrialBalance(tenantId, filters);
    const income = sumBy(trial, (x) => x.account_type === 'income');
    const expense = sumBy(trial, (x) => x.account_type === 'expense');
    const assets = sumBy(trial, (x) => x.account_type === 'asset');
    const liabilities = sumBy(trial, (x) => x.account_type === 'liability');
    const equity = sumBy(trial, (x) => x.account_type === 'equity');
    const cashflow = await this.getCashFlowSummary(tenantId, filters);

    return {
      profit_loss: {
        income,
        expense,
        net_profit: income - expense,
      },
      balance_sheet: {
        assets,
        liabilities,
        equity,
      },
      cash_flow: cashflow,
      trial_balance: trial,
    };
  },

  async getCashFlowSummary(tenantId, { dateFrom, dateTo } = {}) {
    ensureTenantId(tenantId);
    let receiptQuery = supabase.from('akuntansi_receipts').select('amount, receipt_date').eq('tenant_id', tenantId).is('deleted_at', null);
    let billQuery = supabase.from('akuntansi_vendor_bills').select('amount, due_date').eq('tenant_id', tenantId).is('deleted_at', null);

    if (dateFrom) {
      receiptQuery = receiptQuery.gte('receipt_date', dateFrom);
      billQuery = billQuery.gte('due_date', dateFrom);
    }
    if (dateTo) {
      receiptQuery = receiptQuery.lte('receipt_date', dateTo);
      billQuery = billQuery.lte('due_date', dateTo);
    }

    const [{ data: receipts, error: recErr }, { data: bills, error: billErr }] = await Promise.all([receiptQuery, billQuery]);
    if (recErr) throw recErr;
    if (billErr) throw billErr;

    const cashIn = (receipts || []).reduce((acc, r) => acc + Number(r.amount || 0), 0);
    const cashOut = (bills || []).reduce((acc, b) => acc + Number(b.amount || 0), 0);
    const classified = await this.getCashFlowClassified(tenantId, { dateFrom, dateTo });
    return { cash_in: cashIn, cash_out: cashOut, net_cashflow: cashIn - cashOut, classified };
  },

  async getCashFlowClassified(tenantId, { dateFrom, dateTo } = {}) {
    ensureTenantId(tenantId);
    await this.ensureCashflowDefaultMapping(tenantId);
    const { data: mapRows } = await supabase
      .from('akuntansi_cashflow_account_map')
      .select('account_type, cashflow_group, is_active')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);
    const mapping = new Map((mapRows || []).map((r) => [r.account_type, r.cashflow_group]));

    let query = supabase
      .from('akuntansi_journal_entry_lines')
      .select('debit, credit, account:account_id(account_type), journal:journal_entry_id(entry_date)')
      .eq('tenant_id', tenantId);

    if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00.000Z`);
    if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59.999Z`);

    const { data, error } = await query;
    if (error) throw error;

    const summary = { operating: 0, investing: 0, financing: 0 };
    for (const row of data || []) {
      const t = row.account?.account_type;
      const flow = Number(row.debit || 0) - Number(row.credit || 0);
      const group = mapping.get(t) || (['income', 'expense'].includes(t) ? 'operating' : ['asset'].includes(t) ? 'investing' : 'financing');
      if (group === 'operating') summary.operating += flow;
      else if (group === 'investing') summary.investing += flow;
      else summary.financing += flow;
    }
    return summary;
  },

  async getGeneralLedger(tenantId, { accountId, dateFrom, dateTo, page = 1, pageSize = 20, search = '', sortBy = 'created_at', sortDir = 'desc' } = {}) {
    ensureTenantId(tenantId);
    const from = Math.max(0, (page - 1) * pageSize);
    const to = from + pageSize - 1;

    const sortColumn = ['created_at', 'debit', 'credit'].includes(sortBy) ? sortBy : 'created_at';
    const ascending = String(sortDir).toLowerCase() === 'asc';

    let query = supabase
      .from('akuntansi_journal_entry_lines')
      .select('id, debit, credit, description, account:account_id(id, code, name), journal:journal_entry_id(id, entry_date, description)', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order(sortColumn, { ascending })
      .range(from, to);

    if (accountId) query = query.eq('account_id', accountId);
    if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00.000Z`);
    if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59.999Z`);
    if (search) query = query.ilike('description', `%${search}%`);

    const { data, error, count } = await query;
    if (error) throw error;
    return { rows: data || [], total: count || 0, page, pageSize };
  },
};
