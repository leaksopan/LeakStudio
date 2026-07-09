import { describe, expect, it, vi } from 'vitest';
import { exportSectionedCsv } from './exportSectionedCsv.js';

describe('exportSectionedCsv', () => {
  it('creates downloadable sectioned CSV', () => {
    const click = vi.fn();
    const anchor = { href: '', download: '', click };
    const originalDocument = globalThis.document;
    globalThis.document = { createElement: vi.fn().mockReturnValue(anchor) };
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    exportSectionedCsv('x.csv', [
      { title: 'A', headers: ['h1'], rows: [['v1']] },
      { title: 'B', headers: ['h2'], rows: [['v2']] },
    ]);

    expect(globalThis.document.createElement).toHaveBeenCalledWith('a');
    expect(click).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:url');

    globalThis.document = originalDocument;
    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
  });
});
