import { supabase } from '@/lib/supabase.js';

function ensureTenantId(tenantId) {
  if (!tenantId) throw new Error('tenantId wajib diisi');
}

export const akuntansiCoreService = {
  async getCoa(tenantId) {
    ensureTenantId(tenantId);
    const { data, error } = await supabase
      .from('akuntansi_chart_of_accounts')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('code', { ascending: true });
    if (error) throw error;
    return data;
  },

  async createCoa(tenantId, payload) {
    ensureTenantId(tenantId);
    const { data, error } = await supabase
      .from('akuntansi_chart_of_accounts')
      .insert({ ...payload, tenant_id: tenantId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getFiscalPeriods(tenantId) {
    ensureTenantId(tenantId);
    const { data, error } = await supabase
      .from('akuntansi_fiscal_periods')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('start_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createFiscalPeriod(tenantId, payload) {
    ensureTenantId(tenantId);
    const { data, error } = await supabase
      .from('akuntansi_fiscal_periods')
      .insert({ ...payload, tenant_id: tenantId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async closeFiscalPeriod(tenantId, periodId) {
    ensureTenantId(tenantId);
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || null;
    const { data, error } = await supabase
      .from('akuntansi_fiscal_periods')
      .update({
        is_closed: true,
        closed_at: new Date().toISOString(),
        closed_by: userId,
        reopened_at: null,
        reopened_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', periodId)
      .is('deleted_at', null)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async reopenFiscalPeriod(tenantId, periodId) {
    ensureTenantId(tenantId);
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || null;
    const { data, error } = await supabase
      .from('akuntansi_fiscal_periods')
      .update({
        is_closed: false,
        reopened_at: new Date().toISOString(),
        reopened_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', periodId)
      .is('deleted_at', null)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createJournalWithLines(tenantId, payload) {
    ensureTenantId(tenantId);
    const { entry_date, description, lines } = payload;

    const period = await this.getOpenPeriodForDate(tenantId, entry_date);
    if (!period) throw new Error('Tidak ada periode fiskal aktif untuk tanggal jurnal');
    if (period.is_closed) throw new Error('Periode fiskal sudah ditutup');

    const totalDebit = lines.reduce((acc, x) => acc + Number(x.debit || 0), 0);
    const totalCredit = lines.reduce((acc, x) => acc + Number(x.credit || 0), 0);

    const { data: journal, error: journalError } = await supabase
      .from('akuntansi_journal_entries')
      .insert({
        tenant_id: tenantId,
        entry_date,
        description,
        lines: { detail: lines },
        total_debit: totalDebit,
        total_credit: totalCredit,
      })
      .select()
      .single();
    if (journalError) throw journalError;

    const lineRows = lines.map((line) => ({
      tenant_id: tenantId,
      journal_entry_id: journal.id,
      account_id: line.account_id,
      description: line.description || null,
      debit: Number(line.debit || 0),
      credit: Number(line.credit || 0),
    }));

    const { error: lineError } = await supabase.from('akuntansi_journal_entry_lines').insert(lineRows);
    if (lineError) throw lineError;

    return journal;
  },

  async getOpenPeriodForDate(tenantId, entryDate) {
    ensureTenantId(tenantId);
    const { data, error } = await supabase
      .from('akuntansi_fiscal_periods')
      .select('*')
      .eq('tenant_id', tenantId)
      .lte('start_date', entryDate)
      .gte('end_date', entryDate)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getPeriodStatusForToday(tenantId) {
    const today = new Date().toISOString().slice(0, 10);
    const period = await this.getOpenPeriodForDate(tenantId, today);
    if (!period) return { hasPeriod: false, isClosed: false, period: null };
    return { hasPeriod: true, isClosed: !!period.is_closed, period };
  },
};
