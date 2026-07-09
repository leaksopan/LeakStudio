import { useEffect, useMemo, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { Input } from '@/components/ui/input.jsx';
import { akuntansiRecurringService } from '@/services/akuntansiRecurringService.js';

export default function RunnerMonitorPage() {
  const { tenant } = useTenant();
  const [rows, setRows] = useState([]);
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');

  useEffect(() => {
    let active = true;
    if (!tenant?.id) return () => { active = false; };
    (async () => {
      const data = await akuntansiRecurringService.getRunnerLogs(tenant.id);
      if (active) setRows(data);
    })();
    return () => { active = false; };
  }, [tenant?.id]);

  const filtered = useMemo(() => rows.filter((r) => {
    const okDate = !date || r.run_date === date;
    const okStatus = status === 'all' || r.status === status;
    const okType = type === 'all' || r.runner_type === type;
    return okDate && okStatus && okType;
  }), [rows, date, status, type]);

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">Runner Monitor</h2>
      <div className="grid gap-3 md:grid-cols-4">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">Semua Tipe</option>
          <option value="recurring">Recurring</option>
          <option value="reversal">Reversal</option>
        </select>
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Semua Status</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
      </div>
      {filtered.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada log runner.</p> : filtered.map((r) => (
        <div key={r.id} className="rounded border px-3 py-2 text-sm">
          [{r.status}] {r.runner_type} - {r.run_date} - executed: {r.executed_count}{r.message ? ` - ${r.message}` : ''}
        </div>
      ))}
    </div>
  );
}
