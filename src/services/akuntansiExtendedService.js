import { supabase } from '@/lib/supabase.js';

function ensureTenantId(tenantId) {
  if (!tenantId) throw new Error('tenantId wajib diisi');
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

export const akuntansiExtendedService = {
  getTaxConfigs(tenantId) { return listByTenant('akuntansi_tax_configs', tenantId); },
  createTaxConfig(tenantId, payload) { return createByTenant('akuntansi_tax_configs', tenantId, payload); },

  getEFakturRanges(tenantId) { return listByTenant('akuntansi_efaktur_ranges', tenantId); },
  createEFakturRange(tenantId, payload) { return createByTenant('akuntansi_efaktur_ranges', tenantId, payload); },

  getBudgets(tenantId) { return listByTenant('akuntansi_budgets', tenantId); },
  createBudget(tenantId, payload) { return createByTenant('akuntansi_budgets', tenantId, payload); },

  getBankIntegrations(tenantId) { return listByTenant('akuntansi_bank_integrations', tenantId); },
  createBankIntegration(tenantId, payload) { return createByTenant('akuntansi_bank_integrations', tenantId, payload); },

  getFinancialRatios(tenantId) { return listByTenant('akuntansi_financial_ratios', tenantId); },
  createFinancialRatio(tenantId, payload) { return createByTenant('akuntansi_financial_ratios', tenantId, payload); },

  getCustomerCreditNotes(tenantId) { return listByTenant('akuntansi_customer_credit_notes', tenantId); },
  createCustomerCreditNote(tenantId, payload) { return createByTenant('akuntansi_customer_credit_notes', tenantId, payload); },

  getCustomerDebitNotes(tenantId) { return listByTenant('akuntansi_customer_debit_notes', tenantId); },
  createCustomerDebitNote(tenantId, payload) { return createByTenant('akuntansi_customer_debit_notes', tenantId, payload); },

  getVendorDebitNotes(tenantId) { return listByTenant('akuntansi_vendor_debit_notes', tenantId); },
  createVendorDebitNote(tenantId, payload) { return createByTenant('akuntansi_vendor_debit_notes', tenantId, payload); },

  getInvoiceOffsets(tenantId) { return listByTenant('akuntansi_invoice_offsets', tenantId); },
  createInvoiceOffset(tenantId, payload) { return createByTenant('akuntansi_invoice_offsets', tenantId, payload); },

  async createInvoiceOffsetWithRecalc(tenantId, payload) {
    const created = await createByTenant('akuntansi_invoice_offsets', tenantId, payload);
    await recalculateInvoiceStatus(tenantId, payload.invoice_id);
    return created;
  },

  getCashflowMappings(tenantId) { return listByTenant('akuntansi_cashflow_account_map', tenantId); },
  createCashflowMapping(tenantId, payload) { return createByTenant('akuntansi_cashflow_account_map', tenantId, payload); },

  getPaymentTerms(tenantId) { return listByTenant('akuntansi_payment_terms', tenantId); },
  createPaymentTerm(tenantId, payload) { return createByTenant('akuntansi_payment_terms', tenantId, payload); },
};
