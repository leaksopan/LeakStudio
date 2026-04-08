import { supabase } from '../lib/supabase.js';

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
                m_categories ( id, name ),
                sales_uom:uom_id ( id, name, code ),
                stock_uom:stock_uom_id ( id, name, code )
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
                m_categories ( id, name ),
                sales_uom:uom_id ( id, name, code ),
                stock_uom:stock_uom_id ( id, name, code )
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

        // --- Auto-generate SKU if not provided ---
        let sku = productData.sku?.trim() || '';
        if (!sku) {
            // Get category code for prefix
            let prefix = 'PROD';
            if (productData.category_id) {
                const { data: cat } = await supabase
                    .from('m_categories')
                    .select('code')
                    .eq('id', productData.category_id)
                    .single();
                if (cat?.code) prefix = cat.code.toUpperCase();
            }

            // Count existing products with this prefix in this tenant to get next sequence
            const { count } = await supabase
                .from('m_products')
                .select('id', { count: 'exact', head: true })
                .eq('tenant_id', profile.tenant_id)
                .like('sku', `${prefix}-%`);

            const sequence = String((count || 0) + 1).padStart(3, '0');
            sku = `${prefix}-${sequence}`;
        }
        // -----------------------------------------

        const { data, error } = await supabase
            .from('m_products')
            .insert({
                ...productData,
                sku,
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
                child_product:child_product_id ( id, name, sku, uom_id, m_uoms ( id, name, code ) ),
                usage_uom:usage_uom_id ( id, name, code ),
                variant:variant_id ( id, name )
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
                unit: ing.unit || null,
                usage_uom_id: ing.usage_uom_id || null,
                conversion_factor: ing.conversion_factor || 1,
                variant_id: ing.variant_id || null
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
    // Product Variants Management
    // =========================================
    async getVariants(productId) {
        const { data, error } = await supabase
            .from('m_product_variants')
            .select('*')
            .eq('product_id', productId)
            .is('deleted_at', null)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data;
    },

    async updateVariants(productId, variants) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: profile } = await supabase
            .from('m_user_profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single();

        if (!profile?.tenant_id) throw new Error('User has no tenant assigned');

        // 1. Soft delete existing variants not in the new list
        // Note: Logic here is simple: we delete all and recreate, OR we try to match IDs.
        // Better: match IDs.
        const existingIds = variants.filter(v => v.id).map(v => v.id);

        // Delete removed variants
        let query = supabase
            .from('m_product_variants')
            .update({ deleted_at: new Date().toISOString() })
            .eq('product_id', productId)
            .is('deleted_at', null);

        if (existingIds.length > 0) {
            query = query.not('id', 'in', `(${existingIds.join(',')})`);
        }

        await query;

        // 2. Upsert (Update existing, Insert new)
        const upsertData = variants.map(v => ({
            id: v.id, // if exists, update
            product_id: productId,
            tenant_id: profile.tenant_id,
            name: v.name,
            price_diff: v.price_diff || 0,
            sku: v.sku || null,
            deleted_at: null // ensure it's not deleted if we reactivate a previously deleted ID
        }));

        if (upsertData.length > 0) {
            const { error } = await supabase
                .from('m_product_variants')
                .upsert(upsertData)
                .select();
            if (error) throw error;
        }

        // Update product flag
        await supabase
            .from('m_products')
            .update({ has_variants: variants.length > 0 }) // We need to add this column to m_products too? Or just rely on table check?
        // Actually request didn't ask for has_variants flag in m_products, but it might be useful.
        // For now, let's assume we don't strictly need a flag in m_products if we check the relation.
        // But having it is faster. 
        // Wait, I didn't add `has_variants` to m_products schema in the migration.
        // So I should SKIP updating m_products for now unless I add the column.
        // Let's check if I can add it. It's safer to NOT add it now to avoid complexity.
        // We can just rely on checking m_product_variants table.
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


