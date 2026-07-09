import { describe, expect, it } from 'vitest';
import {
  validateBudget,
  validateCoa,
  validateCustomerInvoice,
  validateEFakturRange,
  validateFiscalPeriod,
  validateJournalEntry,
  validateTaxConfig,
  validatePaymentTerm,
} from './accountingValidation.js';

describe('validateCustomerInvoice', () => {
  it('rejects empty required fields', () => {
    const result = validateCustomerInvoice({});
    expect(result.valid).toBe(false);
    expect(result.errors.customer_id).toBeTruthy();
    expect(result.errors.invoice_number).toBeTruthy();
    expect(result.errors.amount).toBeTruthy();
    expect(result.errors.due_date).toBeTruthy();
  });

  it('accepts valid payload', () => {
    const result = validateCustomerInvoice({
      customer_id: 'cust-1',
      invoice_number: 'INV-001',
      amount: '150000',
      due_date: '2026-05-31',
    });
    expect(result.valid).toBe(true);
    expect(result.payload.amount).toBe(150000);
  });
});

describe('validateCoa', () => {
  it('rejects empty coa payload', () => {
    const result = validateCoa({});
    expect(result.valid).toBe(false);
    expect(result.errors.code).toBeTruthy();
    expect(result.errors.name).toBeTruthy();
    expect(result.errors.account_type).toBeTruthy();
  });
});

describe('validateFiscalPeriod', () => {
  it('rejects invalid period range', () => {
    const result = validateFiscalPeriod({
      name: 'Q1',
      start_date: '2026-03-01',
      end_date: '2026-02-01',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.end_date).toContain('tidak boleh sebelum');
  });
});

describe('validateTaxConfig', () => {
  it('rejects invalid tax', () => {
    const result = validateTaxConfig({ name: '', rate: 120 });
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeTruthy();
    expect(result.errors.rate).toBeTruthy();
  });
});

describe('validateEFakturRange', () => {
  it('rejects invalid range', () => {
    const result = validateEFakturRange({ nsfp_start: '010', nsfp_end: '001' });
    expect(result.valid).toBe(false);
    expect(result.errors.nsfp_end).toBeTruthy();
  });
});

describe('validateBudget', () => {
  it('rejects invalid budget values', () => {
    const result = validateBudget({ cost_center: '', planned_amount: -1, actual_amount: -2 });
    expect(result.valid).toBe(false);
    expect(result.errors.cost_center).toBeTruthy();
    expect(result.errors.planned_amount).toBeTruthy();
    expect(result.errors.actual_amount).toBeTruthy();
  });
});

describe('validatePaymentTerm', () => {
  it('rejects invalid payment term', () => {
    const result = validatePaymentTerm({ name: '', due_days: -1 });
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeTruthy();
    expect(result.errors.due_days).toBeTruthy();
  });
});

describe('validateJournalEntry', () => {
  it('rejects unbalanced journal lines', () => {
    const result = validateJournalEntry({
      entry_date: '2026-05-02',
      description: 'Posting penyesuaian',
      lines: [
        { account_id: 'a1', debit: 100000, credit: 0 },
        { account_id: 'a2', debit: 0, credit: 50000 },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.balance).toContain('seimbang');
  });

  it('accepts balanced journal lines', () => {
    const result = validateJournalEntry({
      entry_date: '2026-05-02',
      description: 'Posting penyesuaian',
      lines: [
        { account_id: 'a1', debit: 100000, credit: 0 },
        { account_id: 'a2', debit: 0, credit: 100000 },
      ],
    });
    expect(result.valid).toBe(true);
    expect(result.totals.debit).toBe(100000);
    expect(result.totals.credit).toBe(100000);
  });
});
