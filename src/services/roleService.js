import { supabase } from '../lib/supabase.js';

// ============================================
// m_roles CRUD
// ============================================
export const roleService = {
    async getAll() {
        const { data, error } = await supabase
            .from('m_roles')
            .select('*')
            .is('deleted_at', null)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data;
    },

    async getById(id) {
        const { data, error } = await supabase
            .from('m_roles')
            .select('*')
            .eq('id', id)
            .is('deleted_at', null)
            .single();
        if (error) throw error;
        return data;
    },

    async create({ name, description }) {
        const { data, error } = await supabase
            .from('m_roles')
            .insert({ name, description })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async update(id, { name, description }) {
        const { data, error } = await supabase
            .from('m_roles')
            .update({ name, description })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async delete(id) {
        const { error } = await supabase
            .from('m_roles')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
    },
};

// ============================================
// m_app_modules CRUD
// ============================================
export const moduleService = {
    async getAll() {
        const { data, error } = await supabase
            .from('m_app_modules')
            .select(`
                *,
                m_app_registry:app_id (
                    id,
                    slug,
                    name
                )
            `)
            .is('deleted_at', null)
            .order('code', { ascending: true });
        if (error) throw error;
        return data;
    },

    async getByApp(appId) {
        const { data, error } = await supabase
            .from('m_app_modules')
            .select('*')
            .eq('app_id', appId)
            .is('deleted_at', null)
            .order('name', { ascending: true });
        if (error) throw error;
        return data;
    },

    async create({ app_id, code, name, description }) {
        const { data, error } = await supabase
            .from('m_app_modules')
            .insert({ app_id, code, name, description })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async update(id, { code, name, description }) {
        const { data, error } = await supabase
            .from('m_app_modules')
            .update({ code, name, description })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async delete(id) {
        const { error } = await supabase
            .from('m_app_modules')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
    },
};

// ============================================
// m_app_registry (read-only for now)
// ============================================
export const appService = {
    async getAll() {
        const { data, error } = await supabase
            .from('m_app_registry')
            .select('*')
            .eq('is_active', true)
            .order('name', { ascending: true });
        if (error) throw error;
        return data;
    },
};

// ============================================
// User Access Management
// ============================================
export const userAccessService = {
    // Get all user profiles (for listing)
    async getUsers() {
        const { data, error } = await supabase
            .from('m_user_profiles')
            .select(`
            *,
            m_roles: role_id (
                id,
                name,
                description
            )
                `)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data;
    },

    // Get a user's app access
    async getUserAppAccess(userId) {
        const { data, error } = await supabase
            .from('m_user_app_access')
            .select('app_id')
            .eq('user_id', userId);
        if (error) throw error;
        return data.map(r => r.app_id);
    },

    // Get a user's module access
    async getUserModuleAccess(userId) {
        const { data, error } = await supabase
            .from('m_user_module_access')
            .select('module_id')
            .eq('user_id', userId);
        if (error) throw error;
        return data.map(r => r.module_id);
    },

    // Get a user's unit bisnis access
    async getUserUnitBisnis(userId) {
        const { data, error } = await supabase
            .from('m_user_unit_bisnis')
            .select('unit_bisnis_id')
            .eq('user_id', userId);
        if (error) throw error;
        return data.map(r => r.unit_bisnis_id);
    },

    // Sync app access for a user
    async syncAppAccess(userId, appIds) {
        const { error: delErr } = await supabase
            .from('m_user_app_access')
            .delete()
            .eq('user_id', userId);
        if (delErr) throw delErr;

        if (appIds.length > 0) {
            const rows = appIds.map(appId => ({ user_id: userId, app_id: appId }));
            const { error: insErr } = await supabase
                .from('m_user_app_access')
                .insert(rows);
            if (insErr) throw insErr;
        }
    },

    // Sync module access for a user
    async syncModuleAccess(userId, moduleIds) {
        const { error: delErr } = await supabase
            .from('m_user_module_access')
            .delete()
            .eq('user_id', userId);
        if (delErr) throw delErr;

        if (moduleIds.length > 0) {
            const rows = moduleIds.map(mid => ({ user_id: userId, module_id: mid }));
            const { error: insErr } = await supabase
                .from('m_user_module_access')
                .insert(rows);
            if (insErr) throw insErr;
        }
    },

    // Sync unit bisnis access for a user
    async syncUnitBisnis(userId, unitBisnisIds) {
        const { error: delErr } = await supabase
            .from('m_user_unit_bisnis')
            .delete()
            .eq('user_id', userId);
        if (delErr) throw delErr;

        if (unitBisnisIds.length > 0) {
            const rows = unitBisnisIds.map(ubId => ({ user_id: userId, unit_bisnis_id: ubId }));
            const { error: insErr } = await supabase
                .from('m_user_unit_bisnis')
                .insert(rows);
            if (insErr) throw insErr;
        }
    },

    // Update user role
    async updateUserRole(userId, roleId) {
        const { error } = await supabase
            .from('m_user_profiles')
            .update({ role_id: roleId })
            .eq('id', userId);
        if (error) throw error;
    },
};

// ============================================
// m_unit_bisnis (read for access config)
// ============================================
export const unitBisnisService = {
    async getAll() {
        const { data, error } = await supabase
            .from('m_unit_bisnis')
            .select('*')
            .order('name', { ascending: true });
        if (error) throw error;
        return data;
    },
};
