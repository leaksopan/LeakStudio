import { describe, expect, it } from 'vitest';
import { mapInventoryError } from './inventoryErrorMap.js';

describe('mapInventoryError', () => {
  it('maps authentication errors', () => {
    expect(mapInventoryError(new Error('Not authenticated'))).toContain('login ulang');
  });

  it('maps invalid transition errors', () => {
    expect(mapInventoryError(new Error('Invalid status transition from draft to completed'))).toContain('tidak valid');
  });

  it('maps stock insufficient errors', () => {
    expect(mapInventoryError(new Error('Insufficient stock in source batch'))).toContain('tidak mencukupi');
  });
});
