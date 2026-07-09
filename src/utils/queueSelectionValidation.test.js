import { describe, expect, it } from 'vitest';
import { validateSelectionByStatus } from './queueSelectionValidation.js';

describe('validateSelectionByStatus', () => {
  const rows = [
    { id: '1', status: 'draft' },
    { id: '2', status: 'failed' },
    { id: '3', status: 'draft' },
  ];

  it('fails for empty selection', () => {
    const result = validateSelectionByStatus(rows, [], 'draft');
    expect(result.valid).toBe(false);
  });

  it('fails when selected has mixed status', () => {
    const result = validateSelectionByStatus(rows, ['1', '2'], 'draft');
    expect(result.valid).toBe(false);
  });

  it('passes when all selected match status', () => {
    const result = validateSelectionByStatus(rows, ['1', '3'], 'draft');
    expect(result.valid).toBe(true);
  });
});
