export function validateSelectionByStatus(rows, selectedIds, expectedStatus) {
  if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
    return { valid: false, message: 'Tidak ada item yang dipilih.' };
  }

  const invalid = selectedIds.some((id) => rows.find((row) => row.id === id)?.status !== expectedStatus);
  if (invalid) {
    return { valid: false, message: `Semua item terpilih harus berstatus ${expectedStatus}.` };
  }

  return { valid: true, message: '' };
}
