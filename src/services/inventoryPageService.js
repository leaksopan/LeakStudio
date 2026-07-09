import { supabase } from '@/lib/supabase.js';

export const inventoryPageService = {
  async getOverviewBatches(tenantId) {
    const { data, error } = await supabase
      .from('t_inventory_batches')
      .select(`
        *,
        m_products ( name, sku, m_units ( symbol ) ),
        m_locations ( name )
      `)
      .eq('tenant_id', tenantId)
      .gt('quantity', 0)
      .order('expiry_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getAdjustmentHistory(tenantId) {
    const { data, error } = await supabase
      .from('t_stock_adjustments')
      .select('*, m_products ( name ), t_inventory_batches ( batch_number )')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return data || [];
  },

  async getTransferHistory(tenantId) {
    const { data, error } = await supabase
      .from('t_stock_transfers')
      .select('*, m_products ( name ), t_inventory_batches ( batch_number ), from_loc:from_location_id ( name ), to_loc:to_location_id ( name )')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return data || [];
  },

  async getProductsAndLocations(tenantId) {
    const [{ data: products, error: prodErr }, { data: locations, error: locErr }] = await Promise.all([
      supabase.from('m_products').select('id, name').eq('tenant_id', tenantId),
      supabase.from('m_locations').select('id, name').eq('tenant_id', tenantId),
    ]);
    if (prodErr) throw prodErr;
    if (locErr) throw locErr;
    return { products: products || [], locations: locations || [] };
  },

  async getBatchesByProduct(productId) {
    const { data, error } = await supabase
      .from('t_inventory_batches')
      .select('id, batch_number, quantity, location_id, m_locations(name)')
      .eq('product_id', productId)
      .gt('quantity', 0);
    if (error) throw error;
    return data || [];
  },

  async getMovementHistory(tenantId, { productId = null, locationId = null, limit = 100 } = {}) {
    let query = supabase
      .from('t_stock_movements')
      .select('*, m_products(name, sku), m_locations(name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (productId) query = query.eq('product_id', productId);
    if (locationId) query = query.eq('location_id', locationId);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },
};
