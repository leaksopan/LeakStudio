import { supabase } from '@/lib/supabase.js';

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

async function listByTenant(table, tenantId) {
  ensureTenantId(tenantId);
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function createByTenant(table, tenantId, payload) {
  ensureTenantId(tenantId);
  const { data, error } = await supabase
    .from(table)
    .insert({ ...payload, tenant_id: tenantId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function recalculateInvoiceStatus(tenantId, invoiceId) {
  if (!invoiceId) return;

  const [{ data: invoice, error: invErr }, { data: receipts, error: recErr }, { data: offsets, error: offErr }] = await Promise.all([
    supabase.from('akuntansi_customer_invoices').select('id, amount').eq('tenant_id', tenantId).eq('id', invoiceId).single(),
    supabase.from('akuntansi_receipts').select('amount').eq('tenant_id', tenantId).eq('invoice_id', invoiceId).is('deleted_at', null),
    supabase.from('akuntansi_invoice_offsets').select('amount').eq('tenant_id', tenantId).eq('invoice_id', invoiceId),
  ]);
  if (invErr) throw invErr;
  if (recErr) throw recErr;
  if (offErr) throw offErr;

  const receiptAmount = (receipts || []).reduce((a, r) => a + Number(r.amount || 0), 0);
  const offsetAmount = (offsets || []).reduce((a, o) => a + Number(o.amount || 0), 0);
  const outstanding = Number(invoice.amount || 0) - receiptAmount - offsetAmount;
  const status = outstanding <= 0 ? 'paid' : outstanding < Number(invoice.amount || 0) ? 'partial' : 'unpaid';

  const { error: updateErr } = await supabase
    .from('akuntansi_customer_invoices')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('id', invoiceId);
  if (updateErr) throw updateErr;
}

export const akuntansiAdvancedService = {
  async getVendorBills(tenantId) {
    ensureTenantId(tenantId);
    const { data, error } = await supabase
      .from('akuntansi_vendor_bills')
      .select('*, vendor:vendor_id(id, name)')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  createVendorBill(tenantId, payload) {
    return assertOpenFiscalPeriod(tenantId, payload?.due_date).then(() =>
      createByTenant('akuntansi_vendor_bills', tenantId, payload),
    );
  },
  getReceipts(tenantId) {
    return listByTenant('akuntansi_receipts', tenantId);
  },
  createReceipt(tenantId, payload) {
    return assertOpenFiscalPeriod(tenantId, payload?.receipt_date)
      .then(() => createByTenant('akuntansi_receipts', tenantId, payload))
      .then(async (created) => {
        await recalculateInvoiceStatus(tenantId, created.invoice_id);
        return created;
      });
  },
  getGiro(tenantId) {
    return listByTenant('akuntansi_giro_payments', tenantId);
  },
  createGiro(tenantId, payload) {
    return assertOpenFiscalPeriod(tenantId, payload?.due_date).then(() =>
      createByTenant('akuntansi_giro_payments', tenantId, payload),
    );
  },
  getBankAccounts(tenantId) {
    return listByTenant('akuntansi_bank_accounts', tenantId);
  },
  createBankAccount(tenantId, payload) {
    return createByTenant('akuntansi_bank_accounts', tenantId, payload);
  },
  getAssets(tenantId) {
    return listByTenant('akuntansi_assets', tenantId);
  },
  createAsset(tenantId, payload) {
    return assertOpenFiscalPeriod(tenantId, payload?.acquisition_date).then(() =>
      createByTenant('akuntansi_assets', tenantId, payload),
    );
  },
  async getRates(tenantId) {
    ensureTenantId(tenantId);
    const { data, error } = await supabase
      .from('akuntansi_currency_rates')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('rate_date', { ascending: false });
    if (error) throw error;
    return data;
  },
  createRate(tenantId, payload) {
    return assertOpenFiscalPeriod(tenantId, payload?.rate_date).then(() =>
      createByTenant('akuntansi_currency_rates', tenantId, payload),
    );
  },
};
