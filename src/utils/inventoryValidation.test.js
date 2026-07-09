import { describe, expect, it } from 'vitest';
import { validateStockAdjustment, validateStockTransfer } from './inventoryValidation.js';

describe('validateStockAdjustment', () => {
  it('validates required fields', () => {
    const result = validateStockAdjustment({});
    expect(result.valid).toBe(false);
    expect(result.errors.product_id).toBeTruthy();
    expect(result.errors.batch_id).toBeTruthy();
    expect(result.errors.location_id).toBeTruthy();
    expect(result.errors.adjustment_qty).toBeTruthy();
    expect(result.errors.reason).toBeTruthy();
  });

  it('accepts non-zero numeric adjustment', () => {
    const result = validateStockAdjustment({
      product_id: 'p1',
      batch_id: 'b1',
      location_id: 'l1',
      adjustment_qty: '-2',
      reason: 'audit',
    });
    expect(result.valid).toBe(true);
    expect(result.payload.adjustment_qty).toBe(-2);
  });
});

describe('validateStockTransfer', () => {
  it('blocks same location transfer', () => {
    const result = validateStockTransfer({
      product_id: 'p1',
      batch_id: 'b1',
      from_location_id: 'loc-1',
      to_location_id: 'loc-1',
      qty: 2,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.to_location_id).toContain('tidak boleh sama');
  });

  it('blocks quantity above stock', () => {
    const result = validateStockTransfer({
      product_id: 'p1',
      batch_id: 'b1',
      from_location_id: 'loc-1',
      to_location_id: 'loc-2',
      qty: 10,
    }, { quantity: 4 });
    expect(result.valid).toBe(false);
    expect(result.errors.qty).toContain('melebihi');
  });
});
