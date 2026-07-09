import { supabase } from '@/lib/supabase.js';

function ensureTenantId(tenantId) {
  if (!tenantId) throw new Error('tenantId wajib diisi');
}

async function logRunnerExecution(tenantId, payload) {
  const { error } = await supabase
    .from('akuntansi_runner_logs')
    .insert({
      tenant_id: tenantId,
      runner_type: payload.runner_type,
      run_date: payload.run_date,
      status: payload.status,
      executed_count: payload.executed_count,
      message: payload.message || null,
    });
  if (error) throw error;
}

export const akuntansiRecurringService = {
  async createRunnerLog(tenantId, payload) {
    ensureTenantId(tenantId);
    await logRunnerExecution(tenantId, payload);
  },
  async getTemplates(tenantId) {
    ensureTenantId(tenantId);
    const { data, error } = await supabase
      .from('akuntansi_recurring_journal_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createTemplate(tenantId, payload) {
    ensureTenantId(tenantId);
    const { data, error } = await supabase
      .from('akuntansi_recurring_journal_templates')
      .insert({ ...payload, tenant_id: tenantId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getReversalSchedules(tenantId) {
    ensureTenantId(tenantId);
    const { data, error } = await supabase
      .from('akuntansi_journal_reversal_schedules')
      .select('*, journal:journal_entry_id(id, entry_date, description), executed:executed_journal_id(id, entry_date, description)')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async scheduleReversal(tenantId, payload) {
    ensureTenantId(tenantId);
    const { data, error } = await supabase
      .from('akuntansi_journal_reversal_schedules')
      .insert({ ...payload, tenant_id: tenantId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async runDueTemplates(tenantId, runDate = new Date().toISOString().slice(0, 10)) {
    ensureTenantId(tenantId);
    const { data: templates, error } = await supabase
      .from('akuntansi_recurring_journal_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .lte('next_run_date', runDate)
      .is('deleted_at', null);
    if (error) throw error;

    let createdCount = 0;
    for (const t of templates || []) {
      const lines = Array.isArray(t.lines) ? t.lines : [];
      const totalDebit = lines.reduce((acc, x) => acc + Number(x.debit || 0), 0);
      const totalCredit = lines.reduce((acc, x) => acc + Number(x.credit || 0), 0);

      const { data: journal, error: jErr } = await supabase
        .from('akuntansi_journal_entries')
        .insert({
          tenant_id: tenantId,
          entry_date: runDate,
          description: `[AUTO] ${t.name}`,
          lines: { detail: lines },
          total_debit: totalDebit,
          total_credit: totalCredit,
        })
        .select()
        .single();
      if (jErr) throw jErr;

      if (lines.length > 0) {
        const lineRows = lines.map((line) => ({
          tenant_id: tenantId,
          journal_entry_id: journal.id,
          account_id: line.account_id,
          description: line.description || null,
          debit: Number(line.debit || 0),
          credit: Number(line.credit || 0),
        }));
        const { error: lineErr } = await supabase.from('akuntansi_journal_entry_lines').insert(lineRows);
        if (lineErr) throw lineErr;
      }

      const nextDate = new Date(runDate);
      if (t.frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
      else nextDate.setMonth(nextDate.getMonth() + 1);
      const { error: updErr } = await supabase
        .from('akuntansi_recurring_journal_templates')
        .update({ next_run_date: nextDate.toISOString().slice(0, 10), updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('id', t.id);
      if (updErr) throw updErr;
      createdCount += 1;
    }
    await logRunnerExecution(tenantId, {
      runner_type: 'recurring',
      run_date: runDate,
      status: 'success',
      executed_count: createdCount,
      message: null,
    });
    return { created_count: createdCount };
  },

  async runDueReversals(tenantId, runDate = new Date().toISOString().slice(0, 10)) {
    ensureTenantId(tenantId);
    const { data: schedules, error } = await supabase
      .from('akuntansi_journal_reversal_schedules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'scheduled')
      .lte('reversal_date', runDate)
      .is('deleted_at', null);
    if (error) throw error;

    let executed = 0;
    for (const s of schedules || []) {
      const { data: original, error: oErr } = await supabase
        .from('akuntansi_journal_entry_lines')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('journal_entry_id', s.journal_entry_id);
      if (oErr) throw oErr;

      const lines = (original || []).map((l) => ({
        account_id: l.account_id,
        description: `[REVERSAL] ${l.description || ''}`,
        debit: Number(l.credit || 0),
        credit: Number(l.debit || 0),
      }));
      const totalDebit = lines.reduce((a, x) => a + x.debit, 0);
      const totalCredit = lines.reduce((a, x) => a + x.credit, 0);

      const { data: journal, error: jErr } = await supabase
        .from('akuntansi_journal_entries')
        .insert({
          tenant_id: tenantId,
          entry_date: runDate,
          description: `[AUTO REVERSAL] ${s.journal_entry_id}`,
          lines: { detail: lines },
          total_debit: totalDebit,
          total_credit: totalCredit,
        })
        .select()
        .single();
      if (jErr) throw jErr;

      const lineRows = lines.map((line) => ({
        tenant_id: tenantId,
        journal_entry_id: journal.id,
        account_id: line.account_id,
        description: line.description,
        debit: line.debit,
        credit: line.credit,
      }));
      const { error: lineErr } = await supabase.from('akuntansi_journal_entry_lines').insert(lineRows);
      if (lineErr) throw lineErr;

      const { error: updErr } = await supabase
        .from('akuntansi_journal_reversal_schedules')
        .update({ status: 'executed', executed_journal_id: journal.id, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('id', s.id);
      if (updErr) throw updErr;
      executed += 1;
    }
    await logRunnerExecution(tenantId, {
      runner_type: 'reversal',
      run_date: runDate,
      status: 'success',
      executed_count: executed,
      message: null,
    });
    return { executed_count: executed };
  },

  async getRunnerLogs(tenantId) {
    ensureTenantId(tenantId);
    const { data, error } = await supabase
      .from('akuntansi_runner_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data;
  },
};
