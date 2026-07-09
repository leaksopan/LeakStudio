const EPSILON = 1e-9;

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateStockAdjustment(input) {
  const errors = {};
  const qty = toNumber(input?.adjustment_qty);

  if (isBlank(input?.product_id)) errors.product_id = 'Produk wajib dipilih.';
  if (isBlank(input?.batch_id)) errors.batch_id = 'Batch wajib dipilih.';
  if (isBlank(input?.location_id)) errors.location_id = 'Lokasi wajib dipilih.';
  if (qty === null || Math.abs(qty) < EPSILON) errors.adjustment_qty = 'Jumlah penyesuaian harus angka dan tidak boleh 0.';
  if (isBlank(input?.reason)) errors.reason = 'Alasan penyesuaian wajib diisi.';

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    payload: {
      ...input,
      adjustment_qty: qty,
      reason: String(input?.reason ?? '').trim(),
      evidence_url: String(input?.evidence_url ?? '').trim() || null,
    },
  };
}

export function validateStockTransfer(input, selectedBatch = null) {
  const errors = {};
  const qty = toNumber(input?.qty);

  if (isBlank(input?.product_id)) errors.product_id = 'Produk wajib dipilih.';
  if (isBlank(input?.batch_id)) errors.batch_id = 'Batch asal wajib dipilih.';
  if (isBlank(input?.from_location_id)) errors.from_location_id = 'Lokasi asal wajib terisi.';
  if (isBlank(input?.to_location_id)) errors.to_location_id = 'Lokasi tujuan wajib dipilih.';
  if (!isBlank(input?.from_location_id) && input?.from_location_id === input?.to_location_id) {
    errors.to_location_id = 'Lokasi asal dan tujuan tidak boleh sama.';
  }
  if (qty === null || qty <= 0) errors.qty = 'Jumlah pindah harus lebih dari 0.';
  if (selectedBatch && qty !== null && qty > Number(selectedBatch.quantity || 0)) {
    errors.qty = `Jumlah pindah melebihi stok batch (${selectedBatch.quantity}).`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    payload: {
      ...input,
      qty,
      evidence_url: String(input?.evidence_url ?? '').trim() || null,
    },
  };
}
