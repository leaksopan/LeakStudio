import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { akuntansiEnterpriseService } from '@/services/akuntansiEnterpriseService.js';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';

export default function FxRevaluationPage() {
  const { tenant } = useTenant();
  const [date, setDate] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [gainLoss, setGainLoss] = useState('0');
  const [rows, setRows] = useState([]);
  const load = async () => { if (tenant?.id) setRows(await akuntansiEnterpriseService.getFxRuns(tenant.id)); };
  useEffect(() => { load(); }, [tenant?.id]);
  const onRun = async () => {
    if (!tenant?.id || !date || !currency.trim()) return;
    const total = Number(gainLoss || 0);
    await akuntansiEnterpriseService.createFxRun(tenant.id, { run_date: date, currency_code: currency.trim().toUpperCase(), gain_loss_amount: total, realized_amount: total * 0.4, unrealized_amount: total * 0.6 });
    await load();
  };
  return <div className="space-y-4 rounded-lg border bg-card p-4"><h2 className="text-xl font-semibold">FX Revaluation</h2><div className="grid gap-3 md:grid-cols-4"><Input type="date" value={date} onChange={(e)=>setDate(e.target.value)}/><Input value={currency} onChange={(e)=>setCurrency(e.target.value)} placeholder="Currency"/><Input type="number" value={gainLoss} onChange={(e)=>setGainLoss(e.target.value)} placeholder="Gain/Loss"/><Button onClick={onRun}>Run Revaluation</Button></div>{rows.map((r)=><div key={r.id} className="rounded border px-3 py-2 text-sm">{r.run_date} {r.currency_code} total {Number(r.gain_loss_amount).toLocaleString('id-ID')} (R {Number(r.realized_amount).toLocaleString('id-ID')} / U {Number(r.unrealized_amount).toLocaleString('id-ID')})</div>)}</div>;
}
