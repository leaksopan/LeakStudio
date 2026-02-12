import { supabase } from '../lib/supabase';

// ============================================
// Product Category Service
// ============================================
export const categoryService = {
    async getAll() {
        const { data, error } = await supabase
            .from('m_categories')
            .select('*')
            .is('deleted_at', null)
            .order('name', { ascending: true });
        if (error) throw error;
        return data;
    },

    async getById(id) {
        const { data, error } = await supabase
            .from('m_categories')
            .select('*')
            .eq('id', id)
            .is('deleted_at', null)
            .single();
        if (error) throw error;
        return data;
    },

    async create({ name, slug, description, unit_bisnis_id = null }) {
        // unit_bisnis_id logic: if provided, category is scoped to that unit.
        // If null, valid for whole tenant (default behavior of our RLS/Schema).

        // Fetch current user's tenant_id is handled by RLS trigger or service logic?
        // Actually RLS checks tenant_id matches user's tenant. 
        // We need to pass tenant_id explicitly OR let Postgres handle it if default?
        // Schema says: tenant_id NOT NULL.
        // We'll get tenant_id from user context first.

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // We fetch the user profile to get tenant_id
        const { data: profile } = await supabase
            .from('m_user_profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single();

        if (!profile?.tenant_id) throw new Error('User has no tenant assigned');

        const { data, error } = await supabase
            .from('m_categories')
            .insert({
                tenant_id: profile.tenant_id,
                unit_bisnis_id,
                name,
                slug,
                description
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async update(id, updates) {
        const { data, error } = await supabase
            .from('m_categories')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async delete(id) {
        const { error } = await supabase
            .from('m_categories')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
    }
};

// ============================================
// Product Service
// ============================================
export const productService = {
    async getAll({ category_id = null, search = '' } = {}) {
        let query = supabase
            .from('m_products')
            .select(`
                *,
                m_categories ( id, name )
            `)
            .is('deleted_at', null)
            .order('name', { ascending: true });

        if (category_id) {
            query = query.eq('category_id', category_id);
        }
        if (search) {
            query = query.ilike('name', `%${search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async getById(id) {
        const { data, error } = await supabase
            .from('m_products')
            .select(`
                *,
                m_categories ( id, name )
            `)
            .eq('id', id)
            .is('deleted_at', null)
            .single();
        if (error) throw error;
        return data;
    },

    async create(productData) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: profile } = await supabase
            .from('m_user_profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single();

        if (!profile?.tenant_id) throw new Error('User has no tenant assigned');

        const { data, error } = await supabase
            .from('m_products')
            .insert({
                ...productData,
                // Ensure new fields are passed: item_class_id, item_group_id, etc.
                tenant_id: profile.tenant_id
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async update(id, updates) {
        const { data, error } = await supabase
            .from('m_products')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async delete(id) {
        const { error } = await supabase
            .from('m_products')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
    },

    // =========================================
    // Recipe / BOM Management
    // =========================================
    async getRecipe(productId) {
        const { data, error } = await supabase
            .from('m_product_compositions')
            .select(`
                *,
                child_product:child_product_id ( id, name, unit, price )
            `)
            .eq('parent_product_id', productId)
            .is('deleted_at', null);

        if (error) throw error;
        return data;
    },

    async updateRecipe(productId, ingredients) {
        // ... existing implementation ...
        // (Keeping existing code, just adding new methods below)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: profile } = await supabase
            .from('m_user_profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single();

        if (!profile?.tenant_id) throw new Error('User has no tenant assigned');

        const { error: delError } = await supabase
            .from('m_product_compositions')
            .update({ deleted_at: new Date().toISOString() })
            .eq('parent_product_id', productId)
            .is('deleted_at', null);

        if (delError) throw delError;

        if (ingredients.length > 0) {
            const rows = ingredients.map(ing => ({
                tenant_id: profile.tenant_id,
                parent_product_id: productId,
                child_product_id: ing.child_product_id,
                quantity: ing.quantity,
                unit: ing.unit
            }));

            const { error: insError } = await supabase
                .from('m_product_compositions')
                .insert(rows);
            if (insError) throw insError;
        }

        await supabase
            .from('m_products')
            .update({ has_recipe: ingredients.length > 0 })
            .eq('id', productId);
    },

    // =========================================
    // Multi-UOM Management
    // =========================================
    async getProductUnits(productId) {
        const { data, error } = await supabase
            .from('m_product_units')
            .select(`
                *,
                m_uoms ( code, name )
            `)
            .eq('product_id', productId)
            .is('deleted_at', null);

        if (error) throw error;
        return data;
    },

    async updateProductUnits(productId, units) {
        // units: [{ uom_id, conversion_factor, buy_price, sell_price, is_base }]
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: profile } = await supabase
            .from('m_user_profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single();

        // 1. Soft delete old units
        const { error: delError } = await supabase
            .from('m_product_units')
            .update({ deleted_at: new Date().toISOString() })
            .eq('product_id', productId)
            .is('deleted_at', null);

        if (delError) throw delError;

        // 2. Insert new units
        if (units.length > 0) {
            const rows = units.map(u => ({
                tenant_id: profile.tenant_id,
                product_id: productId,
                uom_id: u.uom_id,
                conversion_factor: u.conversion_factor,
                buy_price: u.buy_price,
                sell_price: u.sell_price,
                is_base: u.is_base
            }));

            const { error: insError } = await supabase
                .from('m_product_units')
                .insert(rows);

            if (insError) throw insError;
        }
    }
};
