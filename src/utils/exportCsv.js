export function exportCsv(filename, headers, rows) {
  const csvRows = [headers.join(','), ...rows.map((row) => row.map((cell) => `${String(cell ?? '').replaceAll(',', ';')}`).join(','))];
  const csv = csvRows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
