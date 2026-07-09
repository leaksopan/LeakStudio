export function filterQueueRows(rows, { actionType = 'all', startDate = '', endDate = '', keyword = '' } = {}) {
  return rows.filter((row) => {
    if (actionType !== 'all' && row.action_type !== actionType) return false;
    const created = new Date(row.created_at).getTime();
    if (startDate && created < new Date(startDate).getTime()) return false;
    if (endDate && created > new Date(`${endDate}T23:59:59`).getTime()) return false;
    if (keyword.trim()) {
      const term = keyword.toLowerCase();
      const payloadText = JSON.stringify(row.payload || {}).toLowerCase();
      const errorText = String(row.last_error || '').toLowerCase();
      if (!String(row.id).toLowerCase().includes(term)
        && !String(row.rule_id || '').toLowerCase().includes(term)
        && !payloadText.includes(term)
        && !errorText.includes(term)) {
        return false;
      }
    }
    return true;
  });
}

export function buildTrendRows(rows, dayLimit = 7) {
  const trendMap = rows.reduce((acc, row) => {
    const dateKey = new Date(row.created_at).toISOString().slice(0, 10);
    if (!acc[dateKey]) acc[dateKey] = { processed: 0, failed: 0 };
    if (row.status === 'processed') acc[dateKey].processed += 1;
    if (row.status === 'failed') acc[dateKey].failed += 1;
    return acc;
  }, {});
  return Object.entries(trendMap).sort((a, b) => (a[0] > b[0] ? -1 : 1)).slice(0, dayLimit);
}
