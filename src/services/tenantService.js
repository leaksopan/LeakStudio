import { supabase } from '../lib/supabase';

export const tenantService = {
    async getTenants() {
        const { data, error } = await supabase
            .from('m_tenants')
            .select(`
                *,
                m_tenant_apps (
                    app_id,
                    enabled,
                    m_app_registry:app_id ( id, name, slug, icon )
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async getTenantById(id) {
        const { data, error } = await supabase
            .from('m_tenants')
            .select(`
                *,
                m_tenant_apps (
                    app_id,
                    enabled,
                    m_app_registry:app_id ( id, name, slug, icon )
                ),
                m_unit_bisnis ( id, name, code, is_active )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async onboardTenant({ tenantName, tenantSlug, plan, email, password, fullName, appIds }) {
        const { data, error } = await supabase.functions.invoke('create-tenant-user', {
            body: { tenantName, tenantSlug, plan, email, password, fullName, appIds },
        });

        if (error) {
            // FunctionsHttpError contains the response body in error.context
            let msg = error.message || 'Failed to onboard tenant';
            try {
                if (error.context && typeof error.context.json === 'function') {
                    const body = await error.context.json();
                    msg = body?.error || msg;
                }
            } catch (_) { /* ignore parse errors */ }
            throw new Error(msg);
        }
        if (data?.error) throw new Error(data.error);
        return data;
    },

    async getApps() {
        const { data, error } = await supabase
            .from('m_app_registry')
            .select('*')
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (error) throw error;
        return data;
    },

    async getUnitBisnis(tenantId) {
        const { data, error } = await supabase
            .from('m_unit_bisnis')
            .select('*')
            .eq('tenant_id', tenantId);

        if (error) throw error;
        return data;
    },

    async getTenantBySlug(slug) {
        const { data, error } = await supabase
            .from('m_tenants')
            .select(`
                *,
                m_tenant_apps (
                    app_id,
                    enabled,
                    m_app_registry:app_id ( id, name, slug, icon )
                )
            `)
            .eq('slug', slug)
            .single();

        if (error) throw error;
        return data;
    },

    async getUserTenantApps(userId) {
        const { data, error } = await supabase
            .from('m_user_app_access')
            .select(`
                app_id,
                m_app_registry:app_id ( id, name, slug, icon )
            `)
            .eq('user_id', userId);

        if (error) throw error;
        return data;
    },

    async getModulesByAppId(appId) {
        const { data, error } = await supabase
            .from('m_app_modules')
            .select('*')
            .eq('app_id', appId)
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (error) throw error;
        return data;
    },
};
