import { supabase } from '@/lib/supabase.js';

function ensureTenantId(tenantId) {
  if (!tenantId) throw new Error('tenantId wajib diisi');
}

async function listByTenant(table, tenantId) {
  ensureTenantId(tenantId);
  const { data, error } = await supabase.from(table).select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function createByTenant(table, tenantId, payload) {
  ensureTenantId(tenantId);
  const { data, error } = await supabase.from(table).insert({ ...payload, tenant_id: tenantId }).select().single();
  if (error) throw error;
  return data;
}

export const akuntansiEnterpriseService = {
  getBankRules: (tenantId) => listByTenant('akuntansi_bank_reconciliation_rules', tenantId),
  createBankRule: (tenantId, payload) => createByTenant('akuntansi_bank_reconciliation_rules', tenantId, payload),
  getBankLines: (tenantId) => listByTenant('akuntansi_bank_statement_lines', tenantId),
  createBankLine: (tenantId, payload) => createByTenant('akuntansi_bank_statement_lines', tenantId, payload),

  getEFakturExports: (tenantId) => listByTenant('akuntansi_efaktur_exports', tenantId),
  createEFakturExport: (tenantId, payload) => createByTenant('akuntansi_efaktur_exports', tenantId, payload),

  getFxRuns: (tenantId) => listByTenant('akuntansi_fx_revaluation_runs', tenantId),
  createFxRun: (tenantId, payload) => createByTenant('akuntansi_fx_revaluation_runs', tenantId, payload),

  getAssetSchedules: (tenantId) => listByTenant('akuntansi_asset_depreciation_schedules', tenantId),
  createAssetSchedule: (tenantId, payload) => createByTenant('akuntansi_asset_depreciation_schedules', tenantId, payload),

  getApprovalRules: (tenantId) => listByTenant('akuntansi_approval_matrix', tenantId),
};
