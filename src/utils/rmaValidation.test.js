import { describe, expect, it } from 'vitest';
import { validateRmaCreate } from './rmaValidation.js';

describe('validateRmaCreate', () => {
  it('fails required fields', () => {
    const result = validateRmaCreate({});
    expect(result.valid).toBe(false);
    expect(result.errors.product_id).toBeTruthy();
    expect(result.errors.qty).toBeTruthy();
    expect(result.errors.reason).toBeTruthy();
  });

  it('passes with valid payload', () => {
    const result = validateRmaCreate({
      product_id: 'p1',
      qty: '2',
      reason: 'Barang cacat',
    });
    expect(result.valid).toBe(true);
    expect(result.payload.qty).toBe(2);
  });
});
