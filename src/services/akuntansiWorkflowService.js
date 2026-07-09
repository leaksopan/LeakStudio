import { supabase } from '@/lib/supabase.js';

function ensureTenantId(tenantId) {
  if (!tenantId) throw new Error('tenantId wajib diisi');
}

async function assertApprovalPrivilege() {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('m_user_profiles')
    .select('m_roles(name)')
    .eq('id', userId)
    .single();
  if (error) throw error;
  const roleName = data?.m_roles?.name;
  if (!['superadmin', 'master', 'manager'].includes(roleName)) {
    throw new Error('Akses ditolak: hanya manager/master/superadmin yang boleh approve voucher');
  }
  return userId;
}

async function assertApprovalByMatrix(tenantId, flowType, amount) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const { data: profile, error: profileErr } = await supabase
    .from('m_user_profiles')
    .select('m_roles(name)')
    .eq('id', userId)
    .single();
  if (profileErr) throw profileErr;
  const userRole = profile?.m_roles?.name;

  const { data: rules, error: ruleErr } = await supabase
    .from('akuntansi_approval_matrix')
    .select('required_role, min_amount')
    .eq('tenant_id', tenantId)
    .eq('flow_type', flowType)
    .eq('is_active', true)
    .order('min_amount', { ascending: false });
  if (ruleErr) throw ruleErr;

  const matched = (rules || []).find((r) => Number(amount || 0) >= Number(r.min_amount || 0));
  if (!matched) return userId;

  if (matched.required_role !== userRole && !['superadmin'].includes(userRole)) {
    throw new Error(`Akses ditolak: nominal ini butuh role ${matched.required_role}`);
  }
  return userId;
}

async function addApprovalTrail(tenantId, paymentVoucherId, action, actorId, actorRole, note = null) {
  const { error } = await supabase.from('akuntansi_payment_voucher_approvals').insert({
    tenant_id: tenantId,
    payment_voucher_id: paymentVoucherId,
    action,
    actor_id: actorId,
    actor_role: actorRole,
    note,
  });
  if (error) throw error;
}

async function pushNotification(tenantId, payload) {
  const { error } = await supabase.from('akuntansi_notifications').insert({
    tenant_id: tenantId,
    event_type: payload.event_type,
    reference_type: payload.reference_type,
    reference_id: payload.reference_id || null,
    title: payload.title,
    message: payload.message || null,
    payload: payload.payload || {},
  });
  if (error) throw error;
}

export const akuntansiWorkflowService = {
  async getPaymentVouchers(tenantId) {
    ensureTenantId(tenantId);
    const { data, error } = await supabase
      .from('akuntansi_payment_vouchers')
      .select('*, lines:akuntansi_payment_voucher_lines(*)')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async createPaymentVoucher(tenantId, payload) {
    ensureTenantId(tenantId);
    const { lines = [], ...header } = payload;
    const { data: created, error } = await supabase
      .from('akuntansi_payment_vouchers')
      .insert({ ...header, tenant_id: tenantId })
      .select()
      .single();
    if (error) throw error;
    const { data: auth } = await supabase.auth.getUser();
    const actorId = auth?.user?.id || null;
    await addApprovalTrail(tenantId, created.id, 'requested', actorId, 'requester', null);
    await pushNotification(tenantId, {
      event_type: 'payment_voucher_requested',
      reference_type: 'payment_voucher',
      reference_id: created.id,
      title: `Payment Voucher ${created.voucher_number} diajukan`,
      message: 'Menunggu approval sesuai matrix.',
      payload: { voucher_number: created.voucher_number, total_amount: created.total_amount },
    });
    if (lines.length > 0) {
      const rows = lines.map((l) => ({ ...l, tenant_id: tenantId, payment_voucher_id: created.id }));
      const { error: lineErr } = await supabase.from('akuntansi_payment_voucher_lines').insert(rows);
      if (lineErr) throw lineErr;
    }
    return created;
  },
  async approvePaymentVoucher(tenantId, voucherId) {
    ensureTenantId(tenantId);
    const userId = await assertApprovalPrivilege();
    const { data: voucherMeta, error: voucherErr } = await supabase
      .from('akuntansi_payment_vouchers')
      .select('total_amount')
      .eq('tenant_id', tenantId)
      .eq('id', voucherId)
      .single();
    if (voucherErr) throw voucherErr;
    await assertApprovalByMatrix(tenantId, 'payment_voucher', voucherMeta.total_amount);
    const { data, error } = await supabase
      .from('akuntansi_payment_vouchers')
      .update({ status: 'approved', approved_by: userId, approved_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('id', voucherId)
      .select()
      .single();
    if (error) throw error;

    const { data: lines, error: lineErr } = await supabase
      .from('akuntansi_payment_voucher_lines')
      .select('source_type, source_id, amount')
      .eq('tenant_id', tenantId)
      .eq('payment_voucher_id', voucherId);
    if (lineErr) throw lineErr;

    const totalAmount = Number(data.total_amount || 0);
    const journalLines = (lines || []).map((line) => ({
      source_type: line.source_type,
      source_id: line.source_id,
      amount: Number(line.amount || 0),
    }));

    const { error: jErr } = await supabase.from('akuntansi_journal_entries').insert({
      tenant_id: tenantId,
      entry_date: new Date().toISOString().slice(0, 10),
      description: `[AUTO] Approval Payment Voucher ${data.voucher_number}`,
      total_debit: totalAmount,
      total_credit: totalAmount,
      lines: { detail: journalLines, source: 'payment_voucher', voucher_id: voucherId },
    });
    if (jErr) throw jErr;

    const { data: profile } = await supabase
      .from('m_user_profiles')
      .select('m_roles(name)')
      .eq('id', userId)
      .single();
    await addApprovalTrail(tenantId, voucherId, 'approved', userId, profile?.m_roles?.name || null, null);
    await pushNotification(tenantId, {
      event_type: 'payment_voucher_approved',
      reference_type: 'payment_voucher',
      reference_id: voucherId,
      title: `Payment Voucher ${data.voucher_number} disetujui`,
      message: 'Voucher telah disetujui dan jurnal otomatis dibuat.',
      payload: { voucher_number: data.voucher_number },
    });

    return data;
  },

  async rejectPaymentVoucher(tenantId, voucherId, note = 'Rejected by approver') {
    ensureTenantId(tenantId);
    if (!String(note || '').trim()) {
      throw new Error('Alasan penolakan wajib diisi');
    }
    const validReasons = ['Dokumen tidak lengkap', 'Nominal tidak sesuai', 'Melebihi budget', 'Data partner tidak valid', 'Lainnya'];
    if (!validReasons.includes(note)) {
      throw new Error(`Alasan penolakan harus salah satu dari: ${validReasons.join(', ')}`);
    }
    const userId = await assertApprovalPrivilege();
    const { data, error } = await supabase
      .from('akuntansi_payment_vouchers')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('id', voucherId)
      .select()
      .single();
    if (error) throw error;
    const { data: profile } = await supabase
      .from('m_user_profiles')
      .select('m_roles(name)')
      .eq('id', userId)
      .single();
    await addApprovalTrail(tenantId, voucherId, 'rejected', userId, profile?.m_roles?.name || null, note);
    await pushNotification(tenantId, {
      event_type: 'payment_voucher_rejected',
      reference_type: 'payment_voucher',
      reference_id: voucherId,
      title: `Payment Voucher ${data.voucher_number} ditolak`,
      message: `Alasan: ${note}`,
      payload: { voucher_number: data.voucher_number, reason: note },
    });
    return data;
  },

  async getPaymentVoucherApprovalTrail(tenantId, voucherId) {
    ensureTenantId(tenantId);
    const { data, error } = await supabase
      .from('akuntansi_payment_voucher_approvals')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('payment_voucher_id', voucherId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },
  async getAccrualEntries(tenantId) {
    ensureTenantId(tenantId);
    const { data, error } = await supabase
      .from('akuntansi_accrual_entries')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async createAccrualEntry(tenantId, payload) {
    ensureTenantId(tenantId);
    const { data, error } = await supabase
      .from('akuntansi_accrual_entries')
      .insert({ ...payload, tenant_id: tenantId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async postAccrualEntry(tenantId, accrualId) {
    ensureTenantId(tenantId);

    const { data: accrual, error: getErr } = await supabase
      .from('akuntansi_accrual_entries')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', accrualId)
      .single();
    if (getErr) throw getErr;
    if (accrual.status === 'posted') return accrual;

    const amount = Number(accrual.amount || 0);
    const { error: jErr } = await supabase.from('akuntansi_journal_entries').insert({
      tenant_id: tenantId,
      entry_date: accrual.accrual_date,
      description: `[AUTO] Post Accrual ${accrual.reference_type}`,
      total_debit: amount,
      total_credit: amount,
      lines: {
        detail: [{ amount, direction: accrual.direction }],
        source: 'accrual',
        accrual_id: accrual.id,
      },
    });
    if (jErr) throw jErr;

    const { data, error } = await supabase
      .from('akuntansi_accrual_entries')
      .update({ status: 'posted', updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('id', accrualId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
