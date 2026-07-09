import { supabase } from '@/lib/supabase.js';
import { notificationSenderService } from '@/services/notificationSenderService.js';
import { classifyNotificationError } from '@/utils/notificationErrorClassifier.js';

function computeNextRetryAt(retryCount) {
  const delays = [1, 5, 15];
  const minutes = delays[Math.max(0, Math.min(retryCount - 1, delays.length - 1))] || 15;
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

async function logNotificationQueueAction({ queueId, action, statusBefore, statusAfter, note, actorId }) {
  await supabase.from('t_inventory_notification_queue_logs').insert({
    queue_id: queueId,
    action,
    status_before: statusBefore || null,
    status_after: statusAfter || null,
    note: note || null,
    actor_id: actorId || null,
  });
}

async function appendMovement({ tenant_id, unit_bisnis_id, location_id, product_id, batch_id, movement_type, qty, balance_after, reference_id, reference_type, created_by }) {
  const { error } = await supabase.from('t_stock_movements').insert({
    tenant_id,
    unit_bisnis_id,
    location_id,
    product_id,
    batch_id,
    movement_type,
    qty,
    balance_after,
    reference_id,
    reference_type,
    created_by,
  });
  if (error) throw error;
}

async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: profile, error } = await supabase
    .from('m_user_profiles')
    .select('id, tenant_id, unit_bisnis_id')
    .eq('id', user.id)
    .single();
  if (error) throw error;
  return profile;
}

export const inventoryModuleService = {
  async listOperationTypes(tenantId) {
    const { data, error } = await supabase
      .from('m_inventory_operation_types')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async createOperationType(payload) {
    const profile = await getProfile();
    const { data, error } = await supabase
      .from('m_inventory_operation_types')
      .insert({ tenant_id: profile.tenant_id, ...payload })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getDashboard(tenantId) {
    const [ops, low, expiring] = await Promise.all([
      supabase.from('t_inventory_operations').select('*').eq('tenant_id', tenantId).order('scheduled_at', { ascending: true }).limit(10),
      supabase.from('m_reordering_rules').select('*, m_products(name), m_locations(name)').eq('tenant_id', tenantId).limit(50),
      supabase.from('t_inventory_batches').select('*, m_products(name), m_locations(name)').eq('tenant_id', tenantId).not('expiry_date', 'is', null).lte('expiry_date', new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()).limit(50),
    ]);
    if (ops.error) throw ops.error;
    if (low.error) throw low.error;
    if (expiring.error) throw expiring.error;
    return { upcomingOperations: ops.data || [], reorderingRules: low.data || [], expiringBatches: expiring.data || [] };
  },

  async listReorderingRules(tenantId) {
    const { data, error } = await supabase
      .from('m_reordering_rules')
      .select('*, m_products(name), m_locations(name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createReorderingRule(payload) {
    const profile = await getProfile();
    const { data, error } = await supabase
      .from('m_reordering_rules')
      .insert({ tenant_id: profile.tenant_id, ...payload })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async listMaterialRequests(tenantId) {
    const { data, error } = await supabase
      .from('t_material_requests')
      .select('*, m_user_profiles!t_material_requests_requester_id_fkey(full_name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createMaterialRequest({ notes, lines }) {
    const profile = await getProfile();
    const { data: mr, error: mrErr } = await supabase
      .from('t_material_requests')
      .insert({
        tenant_id: profile.tenant_id,
        requester_id: profile.id,
        unit_bisnis_id: profile.unit_bisnis_id,
        status: 'submitted',
        notes: notes || null,
      })
      .select()
      .single();
    if (mrErr) throw mrErr;

    if (lines?.length) {
      const payload = lines.map((x) => ({
        material_request_id: mr.id,
        product_id: x.product_id,
        requested_qty: x.requested_qty,
        uom_id: x.uom_id || null,
      }));
      const { error: linesErr } = await supabase.from('t_material_request_lines').insert(payload);
      if (linesErr) throw linesErr;
    }
    if (mr.status === 'submitted' && lines?.length) {
      const { data: internalTransferType } = await supabase
        .from('m_inventory_operation_types')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .eq('code', 'INTERNAL_TRANSFER')
        .maybeSingle();

      if (internalTransferType?.id) {
        await supabase.from('t_inventory_operations').insert({
          tenant_id: profile.tenant_id,
          unit_bisnis_id: profile.unit_bisnis_id,
          operation_type_id: internalTransferType.id,
          source_document_type: 'material_request',
          source_document_id: mr.id,
          status: 'draft',
          notes: `Auto draft from MR ${mr.id}`,
          created_by: profile.id,
        });
      }
    }

    return mr;
  },

  async listPackages(tenantId) {
    const { data, error } = await supabase
      .from('t_inventory_packages')
      .select('*, m_locations(name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createPackage(payload) {
    const profile = await getProfile();
    const { data, error } = await supabase
      .from('t_inventory_packages')
      .insert({ tenant_id: profile.tenant_id, ...payload })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async addPackageItem(payload) {
    const { data, error } = await supabase
      .from('t_inventory_package_items')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async listPackageItems(packageId) {
    const { data, error } = await supabase
      .from('t_inventory_package_items')
      .select('*, m_products(name), t_inventory_batches(batch_number)')
      .eq('package_id', packageId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async removePackageItem(itemId) {
    const { error } = await supabase
      .from('t_inventory_package_items')
      .delete()
      .eq('id', itemId);
    if (error) throw error;
  },

  async unpackPackage(packageId) {
    const { error } = await supabase
      .from('t_inventory_packages')
      .update({ status: 'unpacked', unpacked_at: new Date().toISOString() })
      .eq('id', packageId);
    if (error) throw error;
  },

  async listPickingWaves(tenantId) {
    const { data, error } = await supabase
      .from('t_picking_waves')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createPickingWave({ wave_number, scheduled_date }) {
    const profile = await getProfile();
    const { data, error } = await supabase
      .from('t_picking_waves')
      .insert({
        tenant_id: profile.tenant_id,
        wave_number,
        scheduled_date: scheduled_date || null,
        created_by: profile.id,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async listOperationLinesForPicking(tenantId) {
    const { data, error } = await supabase
      .from('t_inventory_operation_lines')
      .select('*, t_inventory_operations!inner(id, tenant_id, status), m_products(name)')
      .eq('t_inventory_operations.tenant_id', tenantId)
      .in('t_inventory_operations.status', ['submitted', 'approved'])
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async attachLineToWave({ wave_id, operation_line_id }) {
    const { data: existing, error: existingError } = await supabase
      .from('t_picking_wave_lines')
      .select('id')
      .eq('wave_id', wave_id)
      .eq('operation_line_id', operation_line_id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) throw new Error('Operation line sudah ter-attach di wave ini.');

    const { data, error } = await supabase
      .from('t_picking_wave_lines')
      .insert({ wave_id, operation_line_id, status: 'pending' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async listWaveLines(waveId) {
    const { data, error } = await supabase
      .from('t_picking_wave_lines')
      .select('*, t_inventory_operation_lines(qty, m_products(name))')
      .eq('wave_id', waveId)
      .order('id', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async massUpdateWaveLines(waveId, status) {
    const { error } = await supabase
      .from('t_picking_wave_lines')
      .update({ status })
      .eq('wave_id', waveId);
    if (error) throw error;
  },

  async listReservations(tenantId) {
    const { data, error } = await supabase
      .from('t_stock_reservations')
      .select('*, m_products(name), m_locations(name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createReservation(payload) {
    const profile = await getProfile();
    const { data, error } = await supabase
      .from('t_stock_reservations')
      .insert({
        tenant_id: profile.tenant_id,
        ...payload,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getExpiryAndLowStock(tenantId) {
    const [batchesRes, rulesRes] = await Promise.all([
      supabase
        .from('t_inventory_batches')
        .select('*, m_products(name, sku), m_locations(name)')
        .eq('tenant_id', tenantId)
        .not('expiry_date', 'is', null)
        .lte('expiry_date', new Date(Date.now() + (1000 * 60 * 60 * 24 * 60)).toISOString())
        .order('expiry_date', { ascending: true }),
      supabase
        .from('m_reordering_rules')
        .select('*, m_products(name, sku), m_locations(name)')
        .eq('tenant_id', tenantId),
    ]);

    if (batchesRes.error) throw batchesRes.error;
    if (rulesRes.error) throw rulesRes.error;

    const rules = rulesRes.data || [];
    const lowStock = [];
    for (const rule of rules) {
      const { data: sumRows, error: sumError } = await supabase
        .from('t_inventory_batches')
        .select('quantity')
        .eq('tenant_id', tenantId)
        .eq('product_id', rule.product_id)
        .eq('location_id', rule.location_id)
        .gt('quantity', 0);
      if (sumError) throw sumError;

      const currentStock = (sumRows || []).reduce((acc, row) => acc + Number(row.quantity || 0), 0);
      if (currentStock < Number(rule.min_qty || 0)) {
        lowStock.push({ ...rule, current_stock: currentStock, shortage: Number(rule.min_qty) - currentStock });
      }
    }

    return {
      expiringBatches: batchesRes.data || [],
      lowStock,
    };
  },

  async enqueueInventoryAlerts(tenantId) {
    const { expiringBatches, lowStock } = await this.getExpiryAndLowStock(tenantId);

    const queuePayload = [];
    for (const batch of expiringBatches) {
      queuePayload.push({
        tenant_id: tenantId,
        notification_type: 'expiry_alert',
        channel: 'email',
        subject: `Expiry Alert: ${batch.m_products?.name || 'Produk'}`,
        payload: {
          product: batch.m_products?.name,
          batch_number: batch.batch_number,
          expiry_date: batch.expiry_date,
          qty: batch.quantity,
          location: batch.m_locations?.name,
        },
      });
    }

    for (const item of lowStock) {
      queuePayload.push({
        tenant_id: tenantId,
        notification_type: 'low_stock_alert',
        channel: 'email',
        subject: `Low Stock: ${item.m_products?.name || 'Produk'}`,
        payload: {
          product: item.m_products?.name,
          current_stock: item.current_stock,
          min_qty: item.min_qty,
          shortage: item.shortage,
          location: item.m_locations?.name,
          action_type: item.action_type,
        },
      });
    }

    if (queuePayload.length === 0) return { inserted: 0 };

    const { error } = await supabase.from('t_inventory_notification_queue').insert(queuePayload);
    if (error) throw error;
    return { inserted: queuePayload.length };
  },

  async listNotificationQueue(tenantId, status = 'all') {
    let query = supabase
      .from('t_inventory_notification_queue')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (status !== 'all') query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async processNotificationQueueItem(queueId) {
    const profile = await getProfile();
    const { data: queueItem, error: queueError } = await supabase
      .from('t_inventory_notification_queue')
      .select('*')
      .eq('id', queueId)
      .single();
    if (queueError) throw queueError;

    try {
      const sendResult = await notificationSenderService.send({
        channel: queueItem.channel,
        subject: queueItem.subject,
        payload: queueItem.payload,
      });

      const { error } = await supabase
        .from('t_inventory_notification_queue')
        .update({
          status: 'processed',
          last_state_change_at: new Date().toISOString(),
          processed_at: new Date().toISOString(),
          processed_by: profile.id,
          last_error: null,
          payload: {
            ...(queueItem.payload || {}),
            delivery: sendResult,
          },
        })
        .eq('id', queueId);
      if (error) throw error;
      await logNotificationQueueAction({ queueId, action: 'process', statusBefore: queueItem.status, statusAfter: 'processed', note: 'Delivery success', actorId: profile.id });
    } catch (error) {
      const classification = classifyNotificationError(error);
      const isRetryable = classification.retryable;
      const nextRetry = Number(queueItem.retry_count || 0) + (isRetryable ? 1 : 0);
      const nextRetryAt = isRetryable ? computeNextRetryAt(nextRetry) : null;
      await supabase
        .from('t_inventory_notification_queue')
        .update({
          status: 'failed',
          last_state_change_at: new Date().toISOString(),
          processed_at: new Date().toISOString(),
          processed_by: profile.id,
          last_error: error.message,
          last_error_code: classification.code,
          retry_count: nextRetry,
          next_retry_at: nextRetryAt,
          payload: {
            ...(queueItem.payload || {}),
            retryable: isRetryable,
            failed_at: new Date().toISOString(),
          },
        })
        .eq('id', queueId);
      await logNotificationQueueAction({ queueId, action: 'process', statusBefore: queueItem.status, statusAfter: 'failed', note: error.message, actorId: profile.id });
      throw error;
    }
  },

  async processNotificationQueueBulk(queueIds) {
    for (const queueId of queueIds) {
      // eslint-disable-next-line no-await-in-loop
      await this.processNotificationQueueItem(queueId);
    }
  },

  async retryNotificationQueueBulk(queueIds) {
    for (const queueId of queueIds) {
      // eslint-disable-next-line no-await-in-loop
      await this.retryNotificationQueueItem(queueId);
    }
  },

  async markNotificationQueueFailedBulk(queueIds, reason = 'Manual fail mark') {
    for (const queueId of queueIds) {
      // eslint-disable-next-line no-await-in-loop
      await this.markNotificationQueueFailed(queueId, reason);
    }
  },

  async markNotificationQueueFailed(queueId, reason) {
    const profile = await getProfile();
    const { error } = await supabase
      .from('t_inventory_notification_queue')
      .update({
        status: 'failed',
        last_state_change_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
        processed_by: profile.id,
        last_error: reason || 'Manual fail mark',
      })
      .eq('id', queueId);
    if (error) throw error;
    await logNotificationQueueAction({ queueId, action: 'mark_failed', statusBefore: null, statusAfter: 'failed', note: reason, actorId: profile.id });
  },

  async retryNotificationQueueItem(queueId) {
    const { data: item, error: itemError } = await supabase
      .from('t_inventory_notification_queue')
      .select('retry_count, last_state_change_at')
      .eq('id', queueId)
      .single();
    if (itemError) throw itemError;

    const retryCount = Number(item.retry_count || 0) + 1;
    if (retryCount > 3) throw new Error('Retry limit tercapai (maks 3).');
    const last = item.last_state_change_at ? new Date(item.last_state_change_at).getTime() : 0;
    if (last && Date.now() - last < 60000) throw new Error('Retry cooldown 60 detik belum terpenuhi.');

    const { error } = await supabase
      .from('t_inventory_notification_queue')
      .update({
        status: 'draft',
        retry_count: retryCount,
        last_error: null,
        next_retry_at: computeNextRetryAt(retryCount),
        last_state_change_at: new Date().toISOString(),
      })
      .eq('id', queueId);
    if (error) throw error;
    const profile = await getProfile();
    await logNotificationQueueAction({ queueId, action: 'retry', statusBefore: 'failed', statusAfter: 'draft', note: `retry_count=${retryCount}`, actorId: profile.id });
  },

  async listNotificationQueueLogs(queueId) {
    const { data, error } = await supabase
      .from('t_inventory_notification_queue_logs')
      .select('*')
      .eq('queue_id', queueId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async listNotificationQueueLogsByTenant(tenantId, limit = 300) {
    const { data, error } = await supabase
      .from('t_inventory_notification_queue_logs')
      .select('*, t_inventory_notification_queue!inner(tenant_id, notification_type, channel)')
      .eq('t_inventory_notification_queue.tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  async processDueNotificationQueue(tenantId) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('t_inventory_notification_queue')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('status', ['draft', 'failed'])
      .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
      .limit(50);
    if (error) throw error;

    const queueIds = (data || []).map((row) => row.id);
    for (const queueId of queueIds) {
      // eslint-disable-next-line no-await-in-loop
      await this.processNotificationQueueItem(queueId);
    }
    return { processed: queueIds.length };
  },

  async generateReorderAction({ ruleId }) {
    const profile = await getProfile();
    const { data: rule, error: ruleError } = await supabase
      .from('m_reordering_rules')
      .select('*')
      .eq('id', ruleId)
      .single();
    if (ruleError) throw ruleError;

    const { data: stockRows, error: stockError } = await supabase
      .from('t_inventory_batches')
      .select('quantity')
      .eq('tenant_id', profile.tenant_id)
      .eq('product_id', rule.product_id)
      .eq('location_id', rule.location_id)
      .gt('quantity', 0);
    if (stockError) throw stockError;

    const current = (stockRows || []).reduce((acc, row) => acc + Number(row.quantity || 0), 0);
    const target = Number(rule.max_qty || 0);
    const qtyNeeded = Math.max(0, target - current);
    if (qtyNeeded <= 0) {
      return { created: false, message: 'Stok sudah memenuhi max rule.' };
    }

    if (rule.action_type === 'MR') {
      const { data: mr, error: mrError } = await supabase
        .from('t_material_requests')
        .insert({
          tenant_id: profile.tenant_id,
          requester_id: profile.id,
          unit_bisnis_id: profile.unit_bisnis_id,
          status: 'submitted',
          notes: `Auto-generated from reordering rule ${rule.id}`,
        })
        .select()
        .single();
      if (mrError) throw mrError;

      const { error: lineError } = await supabase
        .from('t_material_request_lines')
        .insert({
          material_request_id: mr.id,
          product_id: rule.product_id,
          requested_qty: qtyNeeded,
        });
      if (lineError) throw lineError;
      return { created: true, type: 'MR', reference_id: mr.id, qty: qtyNeeded };
    }

    if (['PR', 'RFQ', 'PO', 'EMAIL'].includes(rule.action_type)) {
      const { data: queueItem, error: queueError } = await supabase
        .from('t_reorder_action_queue')
        .insert({
          tenant_id: profile.tenant_id,
          rule_id: rule.id,
          action_type: rule.action_type,
          payload: {
            product_id: rule.product_id,
            location_id: rule.location_id,
            qty_needed: qtyNeeded,
            generated_from: 'reordering_rule',
          },
          status: 'draft',
          created_by: profile.id,
        })
        .select()
        .single();
      if (queueError) throw queueError;
      return { created: true, type: rule.action_type, reference_id: queueItem.id, qty: qtyNeeded };
    }

    // Default fallback: create draft inventory operation (internal transfer)
    const { data: opType } = await supabase
      .from('m_inventory_operation_types')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .eq('code', 'INTERNAL_TRANSFER')
      .maybeSingle();

    if (!opType?.id) {
      return { created: false, message: 'Operation type INTERNAL_TRANSFER belum tersedia.' };
    }

    const { data: op, error: opError } = await supabase
      .from('t_inventory_operations')
      .insert({
        tenant_id: profile.tenant_id,
        unit_bisnis_id: profile.unit_bisnis_id,
        operation_type_id: opType.id,
        source_document_type: 'reordering_rule',
        source_document_id: rule.id,
        status: 'draft',
        notes: `Auto-generated from reordering rule ${rule.id}`,
        created_by: profile.id,
      })
      .select()
      .single();
    if (opError) throw opError;

    const { error: opLineError } = await supabase
      .from('t_inventory_operation_lines')
      .insert({
        operation_id: op.id,
        product_id: rule.product_id,
        to_location_id: rule.location_id,
        qty: qtyNeeded,
      });
    if (opLineError) throw opLineError;

    return { created: true, type: 'INTERNAL_TRANSFER', reference_id: op.id, qty: qtyNeeded };
  },

  async listReorderQueue(tenantId, status = 'all') {
    let query = supabase
      .from('t_reorder_action_queue')
      .select('*, m_reordering_rules(product_id, location_id)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (status !== 'all') query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async processReorderQueueItem(queueId) {
    const profile = await getProfile();
    const { data: item, error: itemError } = await supabase
      .from('t_reorder_action_queue')
      .select('*')
      .eq('id', queueId)
      .single();
    if (itemError) throw itemError;

    const { error: queueStartError } = await supabase
      .from('t_reorder_action_queue')
      .update({ status: 'queued' })
      .eq('id', queueId);
    if (queueStartError) throw queueStartError;

    try {
      let enrichedPayload = { ...(item.payload || {}) };
      const retryCount = Number(enrichedPayload.retry_count || 0);
      if (retryCount > 3) {
        throw new Error('Retry limit exceeded for this queue item.');
      }
      if (item.action_type === 'EMAIL') {
        enrichedPayload = {
          ...enrichedPayload,
          email_template: 'low_stock_alert',
          target_email: enrichedPayload.target_email || 'inventory@company.local',
          subject: 'Auto Reorder Alert',
        };
      }
      if (['PR', 'RFQ', 'PO'].includes(item.action_type)) {
        enrichedPayload = {
          ...enrichedPayload,
          draft_doc_number: `${item.action_type}-${Date.now()}`,
          draft_generated: true,
        };
      }

      const { error: queueDoneError } = await supabase
        .from('t_reorder_action_queue')
        .update({
          status: 'processed',
          last_state_change_at: new Date().toISOString(),
          processed_at: new Date().toISOString(),
          processed_by: profile.id,
          last_error: null,
          payload: { ...enrichedPayload, processed_at: new Date().toISOString() },
        })
        .eq('id', queueId);
      if (queueDoneError) throw queueDoneError;
    } catch (error) {
      await supabase
        .from('t_reorder_action_queue')
        .update({
          status: 'failed',
          last_state_change_at: new Date().toISOString(),
          processed_at: new Date().toISOString(),
          processed_by: profile.id,
          last_error: error.message,
        })
        .eq('id', queueId);
      throw error;
    }
  },

  async retryReorderQueueItem(queueId) {
    const { data: item, error: itemError } = await supabase
      .from('t_reorder_action_queue')
      .select('payload, created_at')
      .eq('id', queueId)
      .single();
    if (itemError) throw itemError;

    const payload = item.payload || {};
    const retryCount = Number(item.retry_count || payload.retry_count || 0) + 1;
    if (retryCount > 3) throw new Error('Retry limit tercapai (maks 3).');

    const lastRetryAt = payload.last_retry_at ? new Date(payload.last_retry_at).getTime() : 0;
    const now = Date.now();
    if (lastRetryAt && now - lastRetryAt < 60000) {
      throw new Error('Retry cooldown 60 detik belum terpenuhi.');
    }

    const { error } = await supabase
      .from('t_reorder_action_queue')
      .update({
        status: 'draft',
        last_state_change_at: new Date().toISOString(),
        last_error: null,
        retry_count: retryCount,
        payload: {
          ...payload,
          retry_count: retryCount,
          last_retry_at: new Date().toISOString(),
        },
      })
      .eq('id', queueId);
    if (error) throw error;
  },

  async processReorderQueueBulk(queueIds) {
    for (const queueId of queueIds) {
      // eslint-disable-next-line no-await-in-loop
      await this.processReorderQueueItem(queueId);
    }
  },

  async retryReorderQueueBulk(queueIds) {
    for (const queueId of queueIds) {
      // eslint-disable-next-line no-await-in-loop
      await this.retryReorderQueueItem(queueId);
    }
  },

  async markReorderQueueFailed(queueId, reason) {
    const profile = await getProfile();
    const { error } = await supabase
      .from('t_reorder_action_queue')
      .update({
        status: 'failed',
        last_state_change_at: new Date().toISOString(),
        last_error: reason || 'Manual fail mark',
        processed_at: new Date().toISOString(),
        processed_by: profile.id,
      })
      .eq('id', queueId);
    if (error) throw error;
  },

  async requeueProcessedItem(queueId) {
    const { data: item, error: itemError } = await supabase
      .from('t_reorder_action_queue')
      .select('status, retry_count')
      .eq('id', queueId)
      .single();
    if (itemError) throw itemError;
    if (item.status !== 'processed') throw new Error('Hanya item processed yang bisa di-requeue.');
    if (Number(item.retry_count || 0) >= 3) throw new Error('Tidak bisa requeue, retry limit tercapai.');

    const { error } = await supabase
      .from('t_reorder_action_queue')
      .update({
        status: 'draft',
        last_state_change_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', queueId);
    if (error) throw error;
  },

  async listRmaRequests(tenantId) {
    const { data, error } = await supabase
      .from('t_rma_requests')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createRmaRequest({ source_document_type, source_document_id, partner_name, reason, lines }) {
    const profile = await getProfile();
    const { data: rma, error: rmaError } = await supabase
      .from('t_rma_requests')
      .insert({
        tenant_id: profile.tenant_id,
        source_document_type: source_document_type || null,
        source_document_id: source_document_id || null,
        partner_name: partner_name || null,
        reason: reason || null,
        status: 'submitted',
        requested_by: profile.id,
      })
      .select()
      .single();
    if (rmaError) throw rmaError;

    if (lines?.length) {
      const payload = lines.map((line) => ({
        rma_request_id: rma.id,
        product_id: line.product_id,
        batch_id: line.batch_id || null,
        qty: line.qty,
        condition_notes: line.condition_notes || null,
      }));
      const { error: lineError } = await supabase.from('t_rma_request_lines').insert(payload);
      if (lineError) throw lineError;
    }
    return rma;
  },

  async getRmaDetail(rmaId) {
    const { data: rma, error: rmaError } = await supabase
      .from('t_rma_requests')
      .select('*')
      .eq('id', rmaId)
      .single();
    if (rmaError) throw rmaError;

    const { data: lines, error: linesError } = await supabase
      .from('t_rma_request_lines')
      .select('*, m_products(name), t_inventory_batches(batch_number)')
      .eq('rma_request_id', rmaId)
      .order('created_at', { ascending: true });
    if (linesError) throw linesError;

    const { data: movements, error: movementsError } = await supabase
      .from('t_stock_movements')
      .select('*, m_products(name), m_locations(name)')
      .eq('reference_type', 'rma')
      .eq('reference_id', rmaId)
      .order('created_at', { ascending: false });
    if (movementsError) throw movementsError;

    return { rma, lines: lines || [], movements: movements || [] };
  },

  async approveRmaRequest({ rmaId, locationId, notes = null }) {
    const profile = await getProfile();
    const { data: rma, error: rmaError } = await supabase
      .from('t_rma_requests')
      .select('*')
      .eq('id', rmaId)
      .single();
    if (rmaError) throw rmaError;
    if (!['submitted', 'draft'].includes(rma.status)) throw new Error('RMA sudah diproses.');

    const { data: lines, error: linesError } = await supabase
      .from('t_rma_request_lines')
      .select('*')
      .eq('rma_request_id', rmaId);
    if (linesError) throw linesError;

    for (const line of lines || []) {
      const { data: targetBatch } = await supabase
        .from('t_inventory_batches')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('product_id', line.product_id)
        .eq('location_id', locationId)
        .limit(1)
        .maybeSingle();

      if (targetBatch) {
        const newQty = Number(targetBatch.quantity || 0) + Number(line.qty);
        const { error: updErr } = await supabase
          .from('t_inventory_batches')
          .update({ quantity: newQty })
          .eq('id', targetBatch.id);
        if (updErr) throw updErr;

        await supabase.from('t_stock_movements').insert({
          tenant_id: profile.tenant_id,
          unit_bisnis_id: profile.unit_bisnis_id,
          location_id: locationId,
          product_id: line.product_id,
          batch_id: targetBatch.id,
          movement_type: 'RMA_IN',
          qty: Number(line.qty),
          balance_after: newQty,
          reference_type: 'rma',
          reference_id: rmaId,
          created_by: profile.id,
        });
      } else {
        const { data: newBatch, error: insErr } = await supabase
          .from('t_inventory_batches')
          .insert({
            tenant_id: profile.tenant_id,
            unit_bisnis_id: profile.unit_bisnis_id,
            product_id: line.product_id,
            location_id: locationId,
            quantity: line.qty,
            batch_number: `RMA-${Date.now()}`,
          })
          .select()
          .single();
        if (insErr) throw insErr;

        await supabase.from('t_stock_movements').insert({
          tenant_id: profile.tenant_id,
          unit_bisnis_id: profile.unit_bisnis_id,
          location_id: locationId,
          product_id: line.product_id,
          batch_id: newBatch.id,
          movement_type: 'RMA_IN',
          qty: Number(line.qty),
          balance_after: Number(line.qty),
          reference_type: 'rma',
          reference_id: rmaId,
          created_by: profile.id,
        });
      }
    }

    const { error: approveErr } = await supabase
      .from('t_rma_requests')
      .update({
        status: 'approved',
        approved_by: profile.id,
        approved_at: new Date().toISOString(),
        approved_location_id: locationId,
        approved_notes: notes,
      })
      .eq('id', rmaId);
    if (approveErr) throw approveErr;
  },

  async rejectRmaRequest({ rmaId, reason }) {
    const profile = await getProfile();
    const { data: rma, error: rmaError } = await supabase
      .from('t_rma_requests')
      .select('status')
      .eq('id', rmaId)
      .single();
    if (rmaError) throw rmaError;
    if (!['submitted', 'draft'].includes(rma.status)) throw new Error('RMA sudah diproses.');

    const { error } = await supabase
      .from('t_rma_requests')
      .update({
        status: 'rejected',
        rejected_by: profile.id,
        rejected_at: new Date().toISOString(),
        rejected_reason: reason || 'Rejected',
      })
      .eq('id', rmaId);
    if (error) throw error;
  },

  async getInventoryAnalysis(tenantId) {
    const [batchesRes, movesRes] = await Promise.all([
      supabase
        .from('t_inventory_batches')
        .select('product_id, quantity, created_at, cost_price, m_products(name)')
        .eq('tenant_id', tenantId),
      supabase
        .from('t_stock_movements')
        .select('product_id, qty, movement_type, created_at, m_products(name)')
        .eq('tenant_id', tenantId),
    ]);

    if (batchesRes.error) throw batchesRes.error;
    if (movesRes.error) throw movesRes.error;

    const batches = batchesRes.data || [];
    const moves = movesRes.data || [];

    const totalStockValue = batches.reduce((acc, row) => acc + Number(row.quantity || 0) * Number(row.cost_price || 0), 0);

    const productMap = new Map();
    for (const batch of batches) {
      const key = batch.product_id;
      const existing = productMap.get(key) || { product_id: key, name: batch.m_products?.name || '-', qty: 0, age_days_sum: 0, age_rows: 0, outbound_30d: 0 };
      existing.qty += Number(batch.quantity || 0);
      const ageDays = Math.max(0, Math.floor((Date.now() - new Date(batch.created_at).getTime()) / (1000 * 60 * 60 * 24)));
      existing.age_days_sum += ageDays;
      existing.age_rows += 1;
      productMap.set(key, existing);
    }

    const threshold30d = Date.now() - 1000 * 60 * 60 * 24 * 30;
    for (const move of moves) {
      if (new Date(move.created_at).getTime() < threshold30d) continue;
      if (Number(move.qty) < 0) {
        const existing = productMap.get(move.product_id) || { product_id: move.product_id, name: move.m_products?.name || '-', qty: 0, age_days_sum: 0, age_rows: 0, outbound_30d: 0 };
        existing.outbound_30d += Math.abs(Number(move.qty));
        productMap.set(move.product_id, existing);
      }
    }

    const rows = Array.from(productMap.values()).map((row) => {
      const avgAgeDays = row.age_rows > 0 ? row.age_days_sum / row.age_rows : 0;
      const turnover30d = row.qty > 0 ? row.outbound_30d / row.qty : 0;
      return {
        ...row,
        avgAgeDays,
        turnover30d,
        fsnTag: row.outbound_30d > 50 ? 'F' : row.outbound_30d > 10 ? 'S' : 'N',
        stockValue: row.qty * (row.avg_cost || 0),
      };
    });

    const totalOutbound = rows.reduce((acc, row) => acc + row.outbound_30d, 0);
    const productAnalysis = rows
      .sort((a, b) => b.outbound_30d - a.outbound_30d)
      .map((row, index, arr) => {
        const cumulative = arr.slice(0, index + 1).reduce((acc, item) => acc + item.outbound_30d, 0);
        const ratio = totalOutbound > 0 ? cumulative / totalOutbound : 0;
        const xyzTag = ratio <= 0.7 ? 'X' : ratio <= 0.9 ? 'Y' : 'Z';
        return { ...row, xyzTag };
      })
      .sort((a, b) => b.turnover30d - a.turnover30d);

    return {
      totalStockValue,
      totalProducts: productAnalysis.length,
      fastMovingCount: productAnalysis.filter((x) => x.fsnTag === 'F').length,
      slowMovingCount: productAnalysis.filter((x) => x.fsnTag === 'S').length,
      nonMovingCount: productAnalysis.filter((x) => x.fsnTag === 'N').length,
      xCount: productAnalysis.filter((x) => x.xyzTag === 'X').length,
      yCount: productAnalysis.filter((x) => x.xyzTag === 'Y').length,
      zCount: productAnalysis.filter((x) => x.xyzTag === 'Z').length,
      productAnalysis,
    };
  },

  async listDropshipOrders(tenantId) {
    const { data, error } = await supabase
      .from('t_dropship_orders')
      .select('*, m_suppliers(name), m_customers(name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createDropshipOrder({ supplier_id, customer_id, source_document_type, source_document_id, notes, lines }) {
    const profile = await getProfile();
    const { data: order, error: orderError } = await supabase
      .from('t_dropship_orders')
      .insert({
        tenant_id: profile.tenant_id,
        supplier_id: supplier_id || null,
        customer_id: customer_id || null,
        source_document_type: source_document_type || null,
        source_document_id: source_document_id || null,
        status: 'submitted',
        notes: notes || null,
        created_by: profile.id,
      })
      .select()
      .single();
    if (orderError) throw orderError;

    if (lines?.length) {
      const payload = lines.map((line) => ({
        dropship_order_id: order.id,
        product_id: line.product_id,
        qty: line.qty,
        price: line.price || null,
      }));
      const { error: lineError } = await supabase.from('t_dropship_order_lines').insert(payload);
      if (lineError) throw lineError;
    }

    await supabase.from('t_dropship_order_logs').insert({
      dropship_order_id: order.id,
      action: 'create',
      status_before: null,
      status_after: 'submitted',
      note: 'Dropship order created',
      actor_id: profile.id,
    });
    return order;
  },

  async getDropshipOrderDetail(orderId) {
    const { data: order, error: orderError } = await supabase
      .from('t_dropship_orders')
      .select('*, m_suppliers(name), m_customers(name)')
      .eq('id', orderId)
      .single();
    if (orderError) throw orderError;

    const { data: lines, error: lineError } = await supabase
      .from('t_dropship_order_lines')
      .select('*, m_products(name)')
      .eq('dropship_order_id', orderId)
      .order('created_at', { ascending: true });
    if (lineError) throw lineError;

    const { data: logs, error: logError } = await supabase
      .from('t_dropship_order_logs')
      .select('*')
      .eq('dropship_order_id', orderId)
      .order('created_at', { ascending: false });
    if (logError) throw logError;

    return { order, lines: lines || [], logs: logs || [] };
  },

  async updateDropshipStatus(orderId, nextStatus, note = null) {
    const profile = await getProfile();
    const { data: order, error: fetchError } = await supabase
      .from('t_dropship_orders')
      .select('*')
      .eq('id', orderId)
      .single();
    if (fetchError) throw fetchError;

    const transitions = {
      draft: ['submitted', 'cancelled'],
      submitted: ['approved', 'cancelled'],
      approved: ['shipped', 'cancelled'],
      shipped: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: [],
    };
    if (!transitions[order.status]?.includes(nextStatus)) {
      throw new Error(`Invalid dropship transition from ${order.status} to ${nextStatus}`);
    }

    const patch = {
      status: nextStatus,
      updated_at: new Date().toISOString(),
    };
    if (nextStatus === 'approved') {
      patch.approved_by = profile.id;
      patch.approved_at = new Date().toISOString();
    }
    if (nextStatus === 'shipped') patch.shipped_at = new Date().toISOString();
    if (nextStatus === 'delivered') patch.delivered_at = new Date().toISOString();
    if (nextStatus === 'cancelled') patch.cancelled_at = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('t_dropship_orders')
      .update(patch)
      .eq('id', orderId);
    if (updateError) throw updateError;

    await supabase.from('t_dropship_order_logs').insert({
      dropship_order_id: orderId,
      action: 'status_update',
      status_before: order.status,
      status_after: nextStatus,
      note,
      actor_id: profile.id,
    });
  },

  async listSerializerRules(tenantId) {
    const { data, error } = await supabase
      .from('m_barcode_serializer_rules')
      .select('*, m_categories(name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createSerializerRule(payload) {
    const profile = await getProfile();
    const { data, error } = await supabase
      .from('m_barcode_serializer_rules')
      .insert({
        tenant_id: profile.tenant_id,
        mode_type: payload.mode_type || 'SKU',
        ...payload,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateSerializerRule(ruleId, payload) {
    const { error } = await supabase
      .from('m_barcode_serializer_rules')
      .update({
        category_id: payload.category_id || null,
        code_prefix: payload.code_prefix,
        sequence_padding: Number(payload.sequence_padding || 6),
        include_date: Boolean(payload.include_date),
        mode_type: payload.mode_type || 'SKU',
        updated_at: new Date().toISOString(),
      })
      .eq('id', ruleId);
    if (error) throw error;
  },

  async deactivateSerializerRule(ruleId) {
    const profile = await getProfile();
    const { error } = await supabase
      .from('m_barcode_serializer_rules')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivated_by: profile.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ruleId);
    if (error) throw error;
  },

  async reactivateSerializerRule(ruleId) {
    const { error } = await supabase
      .from('m_barcode_serializer_rules')
      .update({
        is_active: true,
        deactivated_at: null,
        deactivated_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ruleId);
    if (error) throw error;
  },

  async generateSerializedCode({ productId, ruleId }) {
    const profile = await getProfile();
    const { data: rule, error: ruleError } = await supabase
      .from('m_barcode_serializer_rules')
      .select('*')
      .eq('id', ruleId)
      .single();
    if (ruleError) throw ruleError;

    const { data: countRows, error: countError } = await supabase
      .from('t_barcode_serial_logs')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .eq('rule_id', ruleId);
    if (countError) throw countError;

    const nextNumber = (countRows?.length || 0) + 1;
    const padded = String(nextNumber).padStart(Number(rule.sequence_padding || 6), '0');
    const datePart = rule.include_date ? new Date().toISOString().slice(0, 10).replaceAll('-', '') : '';
    const generatedCode = `${rule.mode_type || 'SKU'}-${rule.code_prefix}${datePart}${padded}`;

    const { error: logError } = await supabase
      .from('t_barcode_serial_logs')
      .insert({
        tenant_id: profile.tenant_id,
        rule_id: ruleId,
        product_id: productId || null,
        generated_code: generatedCode,
        generated_by: profile.id,
      });
    if (logError) throw logError;

    return generatedCode;
  },

  async listSerialLogs(tenantId, { ruleId = null, productId = null, startDate = '', endDate = '' } = {}) {
    let query = supabase
      .from('t_barcode_serial_logs')
      .select('*, m_products(name), m_barcode_serializer_rules(code_prefix, mode_type)')
      .eq('tenant_id', tenantId)
      .order('generated_at', { ascending: false })
      .limit(200);

    if (ruleId) query = query.eq('rule_id', ruleId);
    if (productId) query = query.eq('product_id', productId);
    if (startDate) query = query.gte('generated_at', `${startDate}T00:00:00`);
    if (endDate) query = query.lte('generated_at', `${endDate}T23:59:59`);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async cancelRmaRequest(rmaId) {
    const { data: rma, error: fetchError } = await supabase
      .from('t_rma_requests')
      .select('status')
      .eq('id', rmaId)
      .single();
    if (fetchError) throw fetchError;
    if (!['draft', 'submitted'].includes(rma.status)) throw new Error('Hanya RMA draft/submitted yang bisa dibatalkan.');

    const { error } = await supabase
      .from('t_rma_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', rmaId);
    if (error) throw error;
  },

  async listOperations(tenantId) {
    const { data, error } = await supabase
      .from('t_inventory_operations')
      .select('*, m_inventory_operation_types(name, code)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getOperationDetail(operationId) {
    const { data: operation, error: opError } = await supabase
      .from('t_inventory_operations')
      .select('*, m_inventory_operation_types(name, code)')
      .eq('id', operationId)
      .single();
    if (opError) throw opError;

    const { data: lines, error: linesError } = await supabase
      .from('t_inventory_operation_lines')
      .select('*, m_products(name), from_location:from_location_id(name), to_location:to_location_id(name)')
      .eq('operation_id', operationId)
      .order('created_at', { ascending: true });
    if (linesError) throw linesError;

    const { data: movements, error: movementsError } = await supabase
      .from('t_stock_movements')
      .select('*, m_products(name), m_locations(name)')
      .eq('reference_type', 'operation')
      .eq('reference_id', operationId)
      .order('created_at', { ascending: false });
    if (movementsError) throw movementsError;

    return { operation, lines: lines || [], movements: movements || [] };
  },

  async getNotificationCenter(tenantId) {
    const [dashboard, pendingOps] = await Promise.all([
      this.getExpiryAndLowStock(tenantId),
      supabase
        .from('t_inventory_operations')
        .select('id, status, scheduled_at, m_inventory_operation_types(name)')
        .eq('tenant_id', tenantId)
        .in('status', ['submitted', 'draft'])
        .order('created_at', { ascending: false })
        .limit(20),
    ]);
    if (pendingOps.error) throw pendingOps.error;
    return {
      expiring: dashboard.expiringBatches || [],
      lowStock: dashboard.lowStock || [],
      pendingApprovals: pendingOps.data || [],
    };
  },

  async createOperation({ operation_type_id, partner_name, scheduled_at, notes, lines }) {
    const profile = await getProfile();
    const { data: opType } = await supabase
      .from('m_inventory_operation_types')
      .select('code, require_signature')
      .eq('id', operation_type_id)
      .single();

    const { data: op, error: opError } = await supabase
      .from('t_inventory_operations')
      .insert({
        tenant_id: profile.tenant_id,
        unit_bisnis_id: profile.unit_bisnis_id,
        operation_type_id,
        partner_name: partner_name || null,
        scheduled_at: scheduled_at || null,
        notes: notes || null,
        status: 'submitted',
        signature_required: opType?.code === 'DELIVERY' || Boolean(opType?.require_signature),
        created_by: profile.id,
      })
      .select()
      .single();
    if (opError) throw opError;

    if (lines?.length) {
      const payload = lines.map((line) => ({ ...line, operation_id: op.id }));
      const { error: linesError } = await supabase.from('t_inventory_operation_lines').insert(payload);
      if (linesError) throw linesError;
    }

    return op;
  },

  async approveOperation(operationId) {
    const profile = await getProfile();
    const { data: operation, error } = await supabase
      .from('t_inventory_operations')
      .select('*, m_inventory_operation_types(code), t_inventory_operation_lines(*)')
      .eq('id', operationId)
      .single();
    if (error) throw error;

    const opCode = operation.m_inventory_operation_types?.code;
    if (opCode === 'DELIVERY' && operation.signature_required && !operation.signature_url) {
      throw new Error('Delivery wajib memiliki signature sebelum approve.');
    }

    for (const line of operation.t_inventory_operation_lines || []) {
      if (opCode === 'RECEIVING') {
        const batchNumber = `RCV-${Date.now()}`;
        const { data: newBatch, error: batchInsertError } = await supabase.from('t_inventory_batches').insert({
          tenant_id: operation.tenant_id,
          unit_bisnis_id: operation.unit_bisnis_id,
          product_id: line.product_id,
          location_id: line.to_location_id,
          quantity: line.qty,
          batch_number: batchNumber,
        }).select().single();
        if (batchInsertError) throw batchInsertError;

        await appendMovement({
          tenant_id: operation.tenant_id,
          unit_bisnis_id: operation.unit_bisnis_id,
          location_id: line.to_location_id,
          product_id: line.product_id,
          batch_id: newBatch.id,
          movement_type: 'RECEIVING',
          qty: line.qty,
          balance_after: line.qty,
          reference_id: operation.id,
          reference_type: 'operation',
          created_by: profile.id,
        });
      }

      if (opCode === 'DELIVERY' || opCode === 'USAGE' || opCode === 'SCRAP') {
        const { data: sourceBatch, error: sourceBatchError } = await supabase
          .from('t_inventory_batches')
          .select('*')
          .eq('product_id', line.product_id)
          .eq('location_id', line.from_location_id)
          .gt('quantity', 0)
          .order('expiry_date', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: true })
          .limit(1)
          .single();
        if (sourceBatchError || !sourceBatch) throw new Error('Batch sumber tidak ditemukan untuk pengeluaran.');
        if (Number(sourceBatch.quantity) < Number(line.qty)) throw new Error('Stok batch sumber tidak mencukupi.');

        const updatedQty = Number(sourceBatch.quantity) - Number(line.qty);
        const { error: updateSourceError } = await supabase
          .from('t_inventory_batches')
          .update({ quantity: updatedQty })
          .eq('id', sourceBatch.id);
        if (updateSourceError) throw updateSourceError;

        await appendMovement({
          tenant_id: operation.tenant_id,
          unit_bisnis_id: operation.unit_bisnis_id,
          location_id: sourceBatch.location_id,
          product_id: line.product_id,
          batch_id: sourceBatch.id,
          movement_type: opCode,
          qty: -Number(line.qty),
          balance_after: updatedQty,
          reference_id: operation.id,
          reference_type: 'operation',
          created_by: profile.id,
        });
      }

      if (opCode === 'INTERNAL_TRANSFER') {
        const { data: sourceBatch, error: sourceBatchError } = await supabase
          .from('t_inventory_batches')
          .select('*')
          .eq('product_id', line.product_id)
          .eq('location_id', line.from_location_id)
          .gt('quantity', 0)
          .order('expiry_date', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: true })
          .limit(1)
          .single();
        if (sourceBatchError || !sourceBatch) throw new Error('Batch sumber transfer tidak ditemukan.');
        if (Number(sourceBatch.quantity) < Number(line.qty)) throw new Error('Stok batch transfer tidak mencukupi.');

        const sourceAfter = Number(sourceBatch.quantity) - Number(line.qty);
        const { error: sourceUpdateError } = await supabase.from('t_inventory_batches').update({ quantity: sourceAfter }).eq('id', sourceBatch.id);
        if (sourceUpdateError) throw sourceUpdateError;

        await appendMovement({
          tenant_id: operation.tenant_id,
          unit_bisnis_id: operation.unit_bisnis_id,
          location_id: line.from_location_id,
          product_id: line.product_id,
          batch_id: sourceBatch.id,
          movement_type: 'TRANSFER_OUT',
          qty: -Number(line.qty),
          balance_after: sourceAfter,
          reference_id: operation.id,
          reference_type: 'operation',
          created_by: profile.id,
        });

        const { data: destBatch } = await supabase
          .from('t_inventory_batches')
          .select('*')
          .eq('product_id', line.product_id)
          .eq('location_id', line.to_location_id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (destBatch) {
          const destAfter = Number(destBatch.quantity) + Number(line.qty);
          const { error: destUpdateError } = await supabase.from('t_inventory_batches').update({ quantity: destAfter }).eq('id', destBatch.id);
          if (destUpdateError) throw destUpdateError;
          await appendMovement({
            tenant_id: operation.tenant_id,
            unit_bisnis_id: operation.unit_bisnis_id,
            location_id: line.to_location_id,
            product_id: line.product_id,
            batch_id: destBatch.id,
            movement_type: 'TRANSFER_IN',
            qty: Number(line.qty),
            balance_after: destAfter,
            reference_id: operation.id,
            reference_type: 'operation',
            created_by: profile.id,
          });
        } else {
          const { data: createdDestBatch, error: destInsertError } = await supabase.from('t_inventory_batches').insert({
            tenant_id: operation.tenant_id,
            unit_bisnis_id: operation.unit_bisnis_id,
            product_id: line.product_id,
            location_id: line.to_location_id,
            quantity: line.qty,
            batch_number: `TRF-${Date.now()}`,
          }).select().single();
          if (destInsertError) throw destInsertError;

          await appendMovement({
            tenant_id: operation.tenant_id,
            unit_bisnis_id: operation.unit_bisnis_id,
            location_id: line.to_location_id,
            product_id: line.product_id,
            batch_id: createdDestBatch.id,
            movement_type: 'TRANSFER_IN',
            qty: Number(line.qty),
            balance_after: Number(line.qty),
            reference_id: operation.id,
            reference_type: 'operation',
            created_by: profile.id,
          });
        }
      }
    }

    const { error: updateError } = await supabase
      .from('t_inventory_operations')
      .update({ status: 'approved', approved_by: profile.id, approved_at: new Date().toISOString() })
      .eq('id', operationId);
    if (updateError) throw updateError;
  },

  async updateOperationSignature({ operationId, signatureUrl, signatureName }) {
    const { error } = await supabase
      .from('t_inventory_operations')
      .update({ signature_url: signatureUrl, signature_name: signatureName || null })
      .eq('id', operationId);
    if (error) throw error;
  },

  async updateOperationStatus(operationId, status) {
    const allowed = ['draft', 'submitted', 'approved', 'completed', 'cancelled'];
    if (!allowed.includes(status)) throw new Error('Invalid status');

    const { data: current, error: currentError } = await supabase
      .from('t_inventory_operations')
      .select('status')
      .eq('id', operationId)
      .single();
    if (currentError) throw currentError;

    const transitions = {
      draft: ['submitted', 'cancelled'],
      submitted: ['approved', 'cancelled'],
      approved: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };
    if (!transitions[current.status]?.includes(status)) {
      throw new Error(`Invalid status transition from ${current.status} to ${status}`);
    }

    const { error } = await supabase
      .from('t_inventory_operations')
      .update({ status })
      .eq('id', operationId);
    if (error) throw error;
  },
};
