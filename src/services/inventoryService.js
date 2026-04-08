import { supabase } from '../lib/supabase.js';

// ============================================
// Internal Helper: Append to Ledger
// ============================================
async function logMovement({ tenant_id, unit_bisnis_id, location_id, product_id, batch_id, type, qty, current_balance, ref_id, ref_type, doc_url, user_id }) {
    const { error } = await supabase
        .from('t_stock_movements')
        .insert({
            tenant_id,
            unit_bisnis_id,
            location_id,
            product_id,
            batch_id,
            movement_type: type,
            qty,
            balance_after: current_balance + qty,
            reference_id: ref_id,
            reference_type: ref_type,
            document_url: doc_url,
            created_by: user_id
        });
    if (error) throw error;
}

export const inventoryService = {
    // =========================================
    // Stock History (Kartu Stok)
    // =========================================
    async getStockCard(productId, { locationId = null, startDate = null, endDate = null } = {}) {
        let query = supabase
            .from('t_stock_movements')
            .select(`
                *,
                m_locations ( name ),
                created_by_user:created_by ( full_name )
            `)
            .eq('product_id', productId)
            .order('created_at', { ascending: false });

        if (locationId) query = query.eq('location_id', locationId);
        if (startDate) query = query.gte('created_at', startDate);
        if (endDate) query = query.lte('created_at', endDate);

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    // =========================================
    // Stock Adjustment (Opname)
    // =========================================
    async adjustStock({ product_id, batch_id, location_id, adjustment_qty, reason, evidence_url }) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: profile } = await supabase
            .from('m_user_profiles')
            .select('tenant_id, unit_bisnis_id') // Assuming user belongs to a unit context or we fetch specific unit
            .eq('id', user.id)
            .single();

        if (!profile?.tenant_id) throw new Error('User has no tenant assigned');

        // 1. Create Adjustment Record
        const { data: adj, error: adjError } = await supabase
            .from('t_stock_adjustments')
            .insert({
                tenant_id: profile.tenant_id,
                unit_bisnis_id: profile.unit_bisnis_id, // Or passed param
                product_id,
                batch_id,
                location_id,
                adjustment_qty,
                reason,
                evidence_url,
                adjusted_by: user.id,
                status: 'completed' // Immediate effect for now
            })
            .select()
            .single();

        if (adjError) throw adjError;

        // 2. Update Batch Quantity
        // First get current qty
        const { data: batch, error: batchError } = await supabase
            .from('t_inventory_batches')
            .select('quantity')
            .eq('id', batch_id)
            .single();

        if (batchError) throw batchError;

        const { error: updateError } = await supabase
            .from('t_inventory_batches')
            .update({ quantity: batch.quantity + adjustment_qty })
            .eq('id', batch_id);

        if (updateError) throw updateError;

        // 3. Log to Ledger
        await logMovement({
            tenant_id: profile.tenant_id,
            unit_bisnis_id: profile.unit_bisnis_id,
            location_id,
            product_id,
            batch_id,
            type: 'ADJUSTMENT',
            qty: adjustment_qty,
            current_balance: batch.quantity,
            ref_id: adj.id,
            ref_type: 'adjustment',
            doc_url: evidence_url,
            user_id: user.id
        });

        return adj;
    },

    // =========================================
    // Internal Transfer (Mutasi)
    // =========================================
    async requestTransfer({ product_id, batch_id, from_location_id, to_location_id, qty, evidence_url }) {
        // Creates a PENDING transfer
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: profile } = await supabase
            .from('m_user_profiles')
            .select('tenant_id, unit_bisnis_id')
            .eq('id', user.id)
            .single();

        const { data, error } = await supabase
            .from('t_stock_transfers')
            .insert({
                tenant_id: profile.tenant_id,
                from_location_id,
                to_location_id,
                product_id,
                batch_id,
                qty,
                status: 'pending',
                requested_by: user.id,
                evidence_url
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async approveTransfer(transferId) {
        // Executes the transfer
        const { data: { user } } = await supabase.auth.getUser();

        const { data: transfer, error: fetchError } = await supabase
            .from('t_stock_transfers')
            .select('*')
            .eq('id', transferId)
            .single();

        if (fetchError) throw fetchError;
        if (transfer.status !== 'pending') throw new Error('Transfer already processed');

        // 1. Deduct from Source Batch
        const { data: sourceBatch } = await supabase
            .from('t_inventory_batches')
            .select('*')
            .eq('id', transfer.batch_id)
            .single();

        if (sourceBatch.quantity < transfer.qty) throw new Error('Insufficient stock in source batch');

        await supabase
            .from('t_inventory_batches')
            .update({ quantity: sourceBatch.quantity - transfer.qty })
            .eq('id', transfer.batch_id);

        await logMovement({
            tenant_id: transfer.tenant_id,
            unit_bisnis_id: null, // Context dependent
            location_id: transfer.from_location_id,
            product_id: transfer.product_id,
            batch_id: transfer.batch_id,
            type: 'TRANSFER_OUT',
            qty: -transfer.qty,
            current_balance: sourceBatch.quantity,
            ref_id: transfer.id,
            ref_type: 'transfer',
            doc_url: transfer.evidence_url,
            user_id: user.id
        });

        // 2. Add to Dest Location
        // Check if batch exists at dest? Or create new "bucket" for that batch at dest.
        // For simplicity, we create a new batch record representing "Same Batch, New Location".

        // Check if a batch record exists with same batch_number + product + location + expiry
        const { data: destBatch } = await supabase
            .from('t_inventory_batches')
            .select('*')
            .eq('product_id', transfer.product_id)
            .eq('location_id', transfer.to_location_id)
            .eq('batch_number', sourceBatch.batch_number)
            .single();

        let newBalance = 0;
        if (destBatch) {
            await supabase
                .from('t_inventory_batches')
                .update({ quantity: destBatch.quantity + transfer.qty })
                .eq('id', destBatch.id);
            newBalance = destBatch.quantity;
        } else {
            await supabase
                .from('t_inventory_batches')
                .insert({
                    tenant_id: transfer.tenant_id,
                    unit_bisnis_id: transfer.to_unit_bisnis_id || sourceBatch.unit_bisnis_id, // Keep same unit if null
                    location_id: transfer.to_location_id,
                    product_id: transfer.product_id,
                    batch_number: sourceBatch.batch_number,
                    expiry_date: sourceBatch.expiry_date,
                    supplier_id: sourceBatch.supplier_id,
                    quantity: transfer.qty,
                    cost_price: sourceBatch.cost_price
                });
        }

        await logMovement({
            tenant_id: transfer.tenant_id,
            unit_bisnis_id: null,
            location_id: transfer.to_location_id,
            product_id: transfer.product_id,
            batch_id: transfer.batch_id, // Ideally link to NEW batch id if created, but using source batch ID for trace linkage is acceptable for simple ledger
            type: 'TRANSFER_IN',
            qty: transfer.qty,
            balance_after: newBalance + transfer.qty,
            ref_id: transfer.id,
            ref_type: 'transfer',
            doc_url: transfer.evidence_url,
            user_id: user.id
        });

        // 3. Mark Completed
        await supabase
            .from('t_stock_transfers')
            .update({ status: 'completed', approved_by: user.id })
            .eq('id', transferId);
    },

    // =========================================
    // POS Automation (The "Brain")
    // =========================================
    async processTransactionInventory(transactionId, items, profile) {
        // items: [{ product_id, quantity, id (transaction_item_id) }]
        // profile: { tenant_id, unit_bisnis_id, id (user_id) }

        for (const item of items) {
            // 1. Check if Product has Recipe
            const { data: product } = await supabase
                .from('m_products')
                .select('has_recipe, track_inventory')
                .eq('id', item.product_id)
                .single();

            if (!product) continue;

            let inventoryItemsToDeduct = [];

            if (product.has_recipe) {
                // Get Ingredients
                const { data: ingredients } = await supabase
                    .from('m_product_compositions')
                    .select('child_product_id, quantity, unit')
                    .eq('parent_product_id', item.product_id)
                    .is('deleted_at', null);

                if (ingredients && ingredients.length > 0) {
                    inventoryItemsToDeduct = ingredients.map(ing => ({
                        productId: ing.child_product_id,
                        qtyRequired: ing.quantity * item.quantity // Recipe Qty * Sold Qty
                    }));
                }
            } else if (product.track_inventory) {
                // Direct Product Deduction
                inventoryItemsToDeduct.push({
                    productId: item.product_id,
                    qtyRequired: item.quantity
                });
            }

            // 2. FEFO Deduction for each inventory item
            for (const stockItem of inventoryItemsToDeduct) {
                await this.deductStockFEFO({
                    ...stockItem,
                    tenant_id: profile.tenant_id,
                    unit_bisnis_id: profile.unit_bisnis_id, // Deduct from user's current unit (e.g. Cafe)
                    ref_id: item.id, // Link to Transaction Item
                    user_id: profile.id
                });
            }
        }
    },

    async deductStockFEFO({ productId, qtyRequired, tenant_id, unit_bisnis_id, ref_id, user_id }) {
        let remainingQty = qtyRequired;

        // 1. Get Batches with Stock (Sorted by Expiry ASC)
        const { data: batches } = await supabase
            .from('t_inventory_batches')
            .select('*')
            .eq('product_id', productId)
            // Ideally we filter by unit_bisnis_id OR location logic. 
            // For now, let's assume one massive stock pool per Unit Bisnis.
            // or specific location if we knew it.
            // Let's filter by UnitBisnis to ensure we don't steal from another branch.
            .eq('unit_bisnis_id', unit_bisnis_id)
            .gt('quantity', 0)
            .is('deleted_at', null)
            .order('expiry_date', { ascending: true, nullsFirst: false }) // Expiring soonest first
            .order('created_at', { ascending: true }); // Then oldest FIFO

        if (!batches || batches.length === 0) {
            // No stock found! Log negative stock? Or error?
            // For POS, we often allow negative stock or just log a "Missing Stock" movement w/ null batch?
            // Let's Log a "No Batch" movement for tracking.
            await logMovement({
                tenant_id,
                unit_bisnis_id,
                location_id: null,
                product_id: productId,
                batch_id: null, // No batch
                type: 'SALE_NO_STOCK',
                qty: -remainingQty,
                current_balance: 0, // Virtual negative
                ref_id,
                ref_type: 'transaction_item',
                doc_url: null,
                user_id
            });
            return;
        }

        // 2. Iterate and Deduct
        for (const batch of batches) {
            if (remainingQty <= 0) break;

            const deductAmt = Math.min(batch.quantity, remainingQty);

            // Update Batch
            await supabase
                .from('t_inventory_batches')
                .update({ quantity: batch.quantity - deductAmt })
                .eq('id', batch.id);

            // Log Movement
            await logMovement({
                tenant_id,
                unit_bisnis_id,
                location_id: batch.location_id,
                product_id: productId,
                batch_id: batch.id,
                type: 'SALE',
                qty: -deductAmt,
                current_balance: batch.quantity - deductAmt,
                ref_id,
                ref_type: 'transaction_item',
                doc_url: null,
                user_id
            });

            remainingQty -= deductAmt;
        }

        // If still remaining (Not enough stock), log the rest as deficit
        if (remainingQty > 0) {
            await logMovement({
                tenant_id,
                unit_bisnis_id,
                location_id: null,
                product_id: productId,
                batch_id: null,
                type: 'SALE_DEFICIT',
                qty: -remainingQty,
                current_balance: -remainingQty,
                ref_id,
                ref_type: 'transaction_item',
                doc_url: null,
                user_id
            });
        }
    }
};
