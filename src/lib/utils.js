import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format angka ke format mata uang IDR.
 * @param {number|string|null} value - Nilai yang akan diformat
 * @param {object} options
 * @param {boolean} options.compact - Jika true, tampilkan singkatan (1,5jt, 2rb, dll)
 * @returns {string} - Contoh: "Rp 1.500.000" atau "Rp 1,5jt"
 */
export function formatCurrency(value, { compact = false } = {}) {
  const num = Number(value);
  if (isNaN(num) || value === null || value === undefined) return 'Rp -';

  if (compact) {
    if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}M`;
    if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}jt`;
    if (num >= 1_000) return `Rp ${(num / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}rb`;
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
