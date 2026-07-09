export function validateRmaCreate(form) {
  const errors = {};
  const qty = Number(form?.qty);

  if (!form?.product_id) errors.product_id = 'Produk wajib dipilih.';
  if (!Number.isFinite(qty) || qty <= 0) errors.qty = 'Qty harus lebih dari 0.';
  if (!form?.reason || String(form.reason).trim() === '') errors.reason = 'Alasan RMA wajib diisi.';

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    payload: {
      ...form,
      qty,
      reason: String(form?.reason || '').trim(),
      source_document_type: String(form?.source_document_type || '').trim() || null,
      source_document_id: String(form?.source_document_id || '').trim() || null,
      partner_name: String(form?.partner_name || '').trim() || null,
    },
  };
}
