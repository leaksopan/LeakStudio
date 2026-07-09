import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { akuntansiEnterpriseService } from '@/services/akuntansiEnterpriseService.js';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';

export default function EFakturExportPage() {
  const { tenant } = useTenant();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState([]);
  const load = async () => { if (tenant?.id) setRows(await akuntansiEnterpriseService.getEFakturExports(tenant.id)); };
  useEffect(() => { load(); }, [tenant?.id]);
  const onExport = async () => {
    if (!tenant?.id || !from || !to) return;
    await akuntansiEnterpriseService.createEFakturExport(tenant.id, { export_type: 'djp_baseline', period_from: from, period_to: to, row_count: 0, file_name: `efaktur-${from}-${to}.csv` });
    await load();
  };
  return <div className="space-y-4 rounded-lg border bg-card p-4"><h2 className="text-xl font-semibold">E-Faktur Export</h2><div className="grid gap-3 md:grid-cols-3"><Input type="date" value={from} onChange={(e)=>setFrom(e.target.value)}/><Input type="date" value={to} onChange={(e)=>setTo(e.target.value)}/><Button onClick={onExport}>Buat Export</Button></div>{rows.map((r)=><div key={r.id} className="rounded border px-3 py-2 text-sm">{r.export_type} {r.period_from} s/d {r.period_to} ({r.file_name || '-'})</div>)}</div>;
}
