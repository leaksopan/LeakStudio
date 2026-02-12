import { supabase } from '../lib/supabase';

// ============================================
// Warehouse Master Data Service
// ============================================
export const warehouseService = {
    // --- Locations ---
    async getLocations({ unit_bisnis_id = null } = {}) {
        let query = supabase
            .from('m_locations')
            .select('*')
            .is('deleted_at', null)
            .order('name', { ascending: true });

        if (unit_bisnis_id) {
            query = query.eq('unit_bisnis_id', unit_bisnis_id);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async createLocation(locationData) {
        // locationData: { name, type, parent_location_id, unit_bisnis_id }
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: profile } = await supabase
            .from('m_user_profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single();

        const { data, error } = await supabase
            .from('m_locations')
            .insert({
                ...locationData,
                tenant_id: profile.tenant_id
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // --- UOMs ---
    async getUOMs() {
        const { data, error } = await supabase
            .from('m_uoms')
            .select('*')
            .is('deleted_at', null)
            .order('name', { ascending: true });
        if (error) throw error;
        return data;
    },

    // --- Suppliers ---
    async getSuppliers() {
        const { data, error } = await supabase
            .from('m_suppliers')
            .select('*')
            .is('deleted_at', null)
            .order('name', { ascending: true });
        if (error) throw error;
        return data;
    },

    // --- Item Classes/Groups/Types ---
    async getMasterData(table) {
        // Generic getter for simple lookup tables
        const validTables = ['m_item_classes', 'm_item_groups', 'm_item_types', 'm_vendors'];
        if (!validTables.includes(table)) throw new Error('Invalid table');

        const { data, error } = await supabase
            .from(table)
            .select('*')
            .is('deleted_at', null)
            .order('name', { ascending: true });
        if (error) throw error;
        return data;
    },

    // --- Inventory Batches (The Core) ---
    async getInventoryBatches({ productId, locationId = null }) {
        let query = supabase
            .from('t_inventory_batches')
            .select(`
                *,
                m_locations ( name ),
                m_suppliers ( name )
            `)
            .eq('product_id', productId)
            .gt('quantity', 0) // Only show available stock
            .is('deleted_at', null)
            .order('expiry_date', { ascending: true }); // FEFO (First Expired First Out)

        if (locationId) {
            query = query.eq('location_id', locationId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async receiveStock({ productId, unit_bisnis_id, location_id, batch_number, expiry_date, supplier_id, quantity, cost_price }) {
        // Inbound Logistics (Receiving)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: profile } = await supabase
            .from('m_user_profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single();

        const { data, error } = await supabase
            .from('t_inventory_batches')
            .insert({
                tenant_id: profile.tenant_id,
                unit_bisnis_id,
                location_id,
                product_id: productId,
                batch_number,
                expiry_date,
                supplier_id,
                quantity,
                cost_price
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
