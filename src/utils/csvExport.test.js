import { describe, expect, it } from 'vitest';
import { toCsv } from './csvExport.js';

describe('toCsv', () => {
  it('serializes rows to csv with escaping', () => {
    const csv = toCsv([
      ['Name', 'Note'],
      ['A', 'hello, world'],
      ['B', 'quote "ok"'],
    ]);

    expect(csv).toContain('"Name","Note"');
    expect(csv).toContain('"A","hello, world"');
    expect(csv).toContain('"B","quote ""ok"""');
  });
});
