import { supabase } from '@/lib/supabase.js';

function ensureTenantId(tenantId) {
  if (!tenantId) throw new Error('tenantId wajib diisi');
}

export const akuntansiSetupService = {
  async getProgress(tenantId) {
    ensureTenantId(tenantId);
    const { data, error } = await supabase
      .from('akuntansi_setup_progress')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('step_key', { ascending: true });
    if (error) throw error;
    return data;
  },

  async setStepCompletion(tenantId, stepKey, completed) {
    ensureTenantId(tenantId);
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || null;
    const payload = {
      tenant_id: tenantId,
      step_key: stepKey,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      completed_by: completed ? userId : null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('akuntansi_setup_progress')
      .upsert(payload, { onConflict: 'tenant_id,step_key' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
