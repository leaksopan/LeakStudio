import { supabase } from '../lib/supabase.js';
import { inventoryService } from './inventoryService.js';

export const transactionService = {
    /**
     * Create a new POS transaction
     * @param {Object} params
     * @param {uuid} params.customer_id
     * @param {uuid} params.unit_bisnis_id
     * @param {string} params.payment_method - 'cash', 'qris', 'transfer'
     * @param {Array} params.items - [{ product_id, quantity, price, subtotal }]
     *        Note: In a high-security env, price should be fetched from DB, not trusted from client.
     *        For this implementation, we will RE-FETCH price to verify.
     */
    async createTransaction({ customer_id, unit_bisnis_id, payment_method, items }) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // 1. Get Tenant Info
        const { data: profile } = await supabase
            .from('m_user_profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single();
        if (!profile?.tenant_id) throw new Error('User has no tenant assigned');

        // 2. Validate Products & Calculate Total (Security Check)
        // We fetch all products involved to check prices
        const productIds = items.map(i => i.product_id);
        const { data: products, error: prodError } = await supabase
            .from('m_products')
            .select('id, name, price, tenant_id')
            .in('id', productIds)
            .eq('tenant_id', profile.tenant_id); // Ensure cross-tenant safety

        if (prodError) throw prodError;
        if (products.length !== productIds.length) {
            throw new Error('Some products are invalid or do not belong to this tenant');
        }

        const productMap = new Map(products.map(p => [p.id, p]));

        // Re-calculate basic totals (ignoring complex discounts for now)
        let totalAmount = 0;
        const verifiedItems = items.map(item => {
            const product = productMap.get(item.product_id);
            const price = parseFloat(product.price); // Use DB price
            const qty = parseFloat(item.quantity);
            const subtotal = price * qty;

            totalAmount += subtotal;

            return {
                product_id: item.product_id,
                product_name: product.name,
                quantity: qty,
                price: price, // Store the snapshot price
                subtotal: subtotal
            };
        });

        // 3. Generate Invoice Number (Simple timestamp based for now)
        const dateStr = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
        const invoice_number = `INV-${dateStr}-${Math.floor(Math.random() * 1000)}`;

        // 4. Insert Transaction Head
        const { data: transaction, error: transError } = await supabase
            .from('t_transactions')
            .insert({
                tenant_id: profile.tenant_id,
                unit_bisnis_id: unit_bisnis_id,
                user_id: user.id,
                customer_id: customer_id || null, // Optional
                invoice_number,
                total_amount: totalAmount,
                payment_method,
                status: 'completed',
                trans_date: new Date().toISOString()
            })
            .select()
            .single();

        if (transError) throw transError;

        // 5. Insert Transaction Items
        const { data: insertedItems, error: itemsError } = await supabase
            .from('t_transaction_items')
            .insert(verifiedItems.map(item => ({
                transaction_id: transaction.id,
                ...item
            })))
            .select();

        if (itemsError) {
            // Ideally we should rollback here, but Supabase JS doesn't support transactions easily without RPC.
            // For now, we flag the transaction as voided if items fail.
            await supabase.from('t_transactions').update({ status: 'void' }).eq('id', transaction.id);
            throw itemsError;
        }

        // 6. Trigger Inventory Automation
        try {
            await inventoryService.processTransactionInventory(transaction.id, insertedItems, profile);
        } catch (invError) {
            console.error('Inventory Sync Failed:', invError);
        }

        return transaction;
    },

    async getHistory({ startDate, endDate, unit_bisnis_id } = {}) {
        let query = supabase
            .from('t_transactions')
            .select(`
                *,
                m_customers ( name ),
                m_user_profiles ( full_name )
            `)
            .is('deleted_at', null) // Soft delete check for voided/hidden
            .order('trans_date', { ascending: false });

        if (startDate) query = query.gte('trans_date', startDate);
        if (endDate) query = query.lte('trans_date', endDate);
        if (unit_bisnis_id) query = query.eq('unit_bisnis_id', unit_bisnis_id);

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async getDetail(id) {
        const { data, error } = await supabase
            .from('t_transactions')
            .select(`
                *,
                m_customers ( name ),
                m_user_profiles ( full_name ),
                t_transaction_items ( * )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }
};
