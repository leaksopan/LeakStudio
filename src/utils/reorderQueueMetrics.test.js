import { describe, expect, it } from 'vitest';
import { buildTrendRows, filterQueueRows } from './reorderQueueMetrics.js';

describe('reorderQueueMetrics', () => {
  const rows = [
    { id: 'a', rule_id: 'r1', action_type: 'MR', status: 'processed', created_at: '2026-05-01T10:00:00Z', payload: {}, last_error: '' },
    { id: 'b', rule_id: 'r2', action_type: 'PO', status: 'failed', created_at: '2026-05-01T11:00:00Z', payload: { note: 'x' }, last_error: 'error' },
    { id: 'c', rule_id: 'r3', action_type: 'MR', status: 'draft', created_at: '2026-05-02T10:00:00Z', payload: {}, last_error: '' },
  ];

  it('filters by action type and keyword', () => {
    const out = filterQueueRows(rows, { actionType: 'MR', keyword: 'r3' });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('c');
  });

  it('builds trend rows', () => {
    const trend = buildTrendRows(rows, 7);
    expect(trend.length).toBeGreaterThan(0);
  });
});
