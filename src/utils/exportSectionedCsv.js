export function exportSectionedCsv(filename, sections) {
  const lines = [];
  sections.forEach((section, idx) => {
    if (idx > 0) lines.push('');
    lines.push(`# ${section.title}`);
    lines.push(section.headers.join(','));
    section.rows.forEach((row) => {
      lines.push(row.map((cell) => `${String(cell ?? '').replaceAll(',', ';')}`).join(','));
    });
  });

  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
