import { supabase } from '@/lib/supabase.js';

const INVOICE_TABLE = 'akuntansi_customer_invoices';
const JOURNAL_TABLE = 'akuntansi_journal_entries';

function ensureTenantId(tenantId) {
  if (!tenantId) throw new Error('tenantId wajib diisi');
}

async function assertOpenFiscalPeriod(tenantId, entryDate) {
  const date = entryDate || new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('akuntansi_fiscal_periods')
    .select('id, is_closed')
    .eq('tenant_id', tenantId)
    .lte('start_date', date)
    .gte('end_date', date)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Tidak ada periode fiskal aktif untuk tanggal transaksi');
  if (data.is_closed) throw new Error('Periode fiskal sudah ditutup');
}

export const akuntansiService = {
  async getInvoiceList(tenantId, { search = '' } = {}) {
    ensureTenantId(tenantId);
    let query = supabase
      .from(INVOICE_TABLE)
      .select('*, customer:customer_id(id, name)')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (search) query = query.ilike('invoice_number', `%${search}%`);
    const { data, error } = await query;
    if (error) throw error;

    const invoices = data || [];
    if (invoices.length === 0) return invoices;

    const invoiceIds = invoices.map((i) => i.id);
    const [{ data: receipts, error: receiptErr }, { data: offsets, error: offsetErr }] = await Promise.all([
      supabase
        .from('akuntansi_receipts')
        .select('invoice_id, amount')
        .eq('tenant_id', tenantId)
        .in('invoice_id', invoiceIds)
        .is('deleted_at', null),
      supabase
        .from('akuntansi_invoice_offsets')
        .select('invoice_id, amount')
        .eq('tenant_id', tenantId)
        .in('invoice_id', invoiceIds),
    ]);
    if (receiptErr) throw receiptErr;
    if (offsetErr) throw offsetErr;

    const receiptByInvoice = new Map();
    for (const r of receipts || []) {
      receiptByInvoice.set(r.invoice_id, (receiptByInvoice.get(r.invoice_id) || 0) + Number(r.amount || 0));
    }
    const offsetByInvoice = new Map();
    for (const o of offsets || []) {
      offsetByInvoice.set(o.invoice_id, (offsetByInvoice.get(o.invoice_id) || 0) + Number(o.amount || 0));
    }

    return invoices.map((inv) => {
      const receivedAmount = receiptByInvoice.get(inv.id) || 0;
      const offsetAmount = offsetByInvoice.get(inv.id) || 0;
      const outstandingAmount = Number(inv.amount || 0) - receivedAmount - offsetAmount;
      const paymentStatus = outstandingAmount <= 0 ? 'paid' : outstandingAmount < Number(inv.amount || 0) ? 'partial' : 'unpaid';
      return {
        ...inv,
        received_amount: receivedAmount,
        offset_amount: offsetAmount,
        outstanding_amount: outstandingAmount,
        payment_status: paymentStatus,
      };
    });
  },

  async createInvoice(tenantId, payload) {
    ensureTenantId(tenantId);
    await assertOpenFiscalPeriod(tenantId, payload?.due_date);
    const { data, error } = await supabase
      .from(INVOICE_TABLE)
      .insert({ ...payload, tenant_id: tenantId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getJournalList(tenantId) {
    ensureTenantId(tenantId);
    const { data, error } = await supabase
      .from(JOURNAL_TABLE)
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('entry_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createJournalEntry(tenantId, payload) {
    ensureTenantId(tenantId);
    const { data, error } = await supabase
      .from(JOURNAL_TABLE)
      .insert({
        ...payload,
        tenant_id: tenantId,
        total_debit: Number(payload?.lines?.debit || 0),
        total_credit: Number(payload?.lines?.credit || 0),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
