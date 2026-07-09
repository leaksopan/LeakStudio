export function mapInventoryError(error) {
  const raw = String(error?.message || '').toLowerCase();

  if (raw.includes('not authenticated')) return 'Sesi login berakhir. Silakan login ulang.';
  if (raw.includes('invalid status transition')) return 'Perubahan status tidak valid untuk kondisi saat ini.';
  if (raw.includes('signature')) return 'Tanda tangan delivery wajib diisi sebelum approve.';
  if (raw.includes('insufficient') || raw.includes('tidak mencukupi')) return 'Stok tidak mencukupi untuk proses ini.';
  if (raw.includes('duplicate') || raw.includes('already') || raw.includes('sudah')) return 'Data sudah ada, tidak bisa diproses dua kali.';

  return error?.message || 'Terjadi kesalahan pada modul inventory.';
}
