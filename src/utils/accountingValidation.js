const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';

export function validateCustomerInvoice(payload = {}) {
  const errors = {};
  const amount = Number(payload.amount);

  if (isBlank(payload.customer_id)) errors.customer_id = 'Customer wajib dipilih';
  if (isBlank(payload.invoice_number)) errors.invoice_number = 'Nomor invoice wajib diisi';
  if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Nominal harus lebih dari 0';
  if (isBlank(payload.due_date)) errors.due_date = 'Jatuh tempo wajib diisi';

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    payload: {
      ...payload,
      amount: Number.isFinite(amount) ? amount : 0,
    },
  };
}

export function validateJournalEntry(payload = {}) {
  const errors = {};
  const lines = Array.isArray(payload.lines) ? payload.lines : [];
  const debit = lines.reduce((acc, line) => acc + (Number(line.debit) || 0), 0);
  const credit = lines.reduce((acc, line) => acc + (Number(line.credit) || 0), 0);

  if (!payload.entry_date) errors.entry_date = 'Tanggal jurnal wajib diisi';
  if (isBlank(payload.description)) errors.description = 'Deskripsi jurnal wajib diisi';
  if (lines.length < 2) errors.lines = 'Minimal 2 baris jurnal';
  if (Math.abs(debit - credit) > 0.0001) errors.balance = 'Total debit dan kredit harus seimbang';

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    totals: { debit, credit },
  };
}

export function validateCoa(payload = {}) {
  const errors = {};
  if (isBlank(payload.code)) errors.code = 'Kode akun wajib diisi';
  if (isBlank(payload.name)) errors.name = 'Nama akun wajib diisi';
  if (isBlank(payload.account_type)) errors.account_type = 'Tipe akun wajib diisi';
  if (isBlank(payload.normal_balance)) errors.normal_balance = 'Saldo normal wajib diisi';
  if (!['debit', 'credit'].includes(String(payload.normal_balance || '').toLowerCase())) {
    errors.normal_balance = 'Saldo normal harus debit atau credit';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateFiscalPeriod(payload = {}) {
  const errors = {};
  if (isBlank(payload.name)) errors.name = 'Nama periode wajib diisi';
  if (isBlank(payload.start_date)) errors.start_date = 'Tanggal mulai wajib diisi';
  if (isBlank(payload.end_date)) errors.end_date = 'Tanggal akhir wajib diisi';
  if (payload.start_date && payload.end_date && payload.end_date < payload.start_date) {
    errors.end_date = 'Tanggal akhir tidak boleh sebelum tanggal mulai';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateTaxConfig(payload = {}) {
  const errors = {};
  const rate = Number(payload.rate);
  if (isBlank(payload.name)) errors.name = 'Nama pajak wajib diisi';
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) errors.rate = 'Tarif pajak harus 0-100';
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateEFakturRange(payload = {}) {
  const errors = {};
  if (isBlank(payload.nsfp_start)) errors.nsfp_start = 'NSFP awal wajib diisi';
  if (isBlank(payload.nsfp_end)) errors.nsfp_end = 'NSFP akhir wajib diisi';
  if (payload.nsfp_start && payload.nsfp_end && payload.nsfp_end < payload.nsfp_start) {
    errors.nsfp_end = 'NSFP akhir tidak boleh lebih kecil dari NSFP awal';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateBudget(payload = {}) {
  const errors = {};
  const planned = Number(payload.planned_amount);
  const actual = Number(payload.actual_amount || 0);
  if (isBlank(payload.cost_center)) errors.cost_center = 'Cost center wajib diisi';
  if (!Number.isFinite(planned) || planned < 0) errors.planned_amount = 'Budget plan tidak valid';
  if (!Number.isFinite(actual) || actual < 0) errors.actual_amount = 'Budget actual tidak valid';
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validatePaymentTerm(payload = {}) {
  const errors = {};
  const dueDays = Number(payload.due_days);
  if (isBlank(payload.name)) errors.name = 'Nama payment term wajib diisi';
  if (!Number.isFinite(dueDays) || dueDays < 0) errors.due_days = 'Jatuh tempo (hari) tidak valid';
  return { valid: Object.keys(errors).length === 0, errors };
}
