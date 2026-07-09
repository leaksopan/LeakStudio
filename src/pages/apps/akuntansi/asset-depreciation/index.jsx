import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { akuntansiEnterpriseService } from '@/services/akuntansiEnterpriseService.js';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';

export default function AssetDepreciationPage() {
  const { tenant } = useTenant();
  const [assetId, setAssetId] = useState('');
  const [periodDate, setPeriodDate] = useState('');
  const [amount, setAmount] = useState('');
  const [bookValue, setBookValue] = useState('');
  const [rows, setRows] = useState([]);

  const load = async () => { if (tenant?.id) setRows(await akuntansiEnterpriseService.getAssetSchedules(tenant.id)); };
  useEffect(() => { load(); }, [tenant?.id]);
  const onAdd = async () => {
    if (!tenant?.id || !assetId.trim() || !periodDate) return;
    await akuntansiEnterpriseService.createAssetSchedule(tenant.id, { asset_id: assetId.trim(), period_date: periodDate, depreciation_amount: Number(amount || 0), book_value_after: Number(bookValue || 0), status: 'scheduled' });
    await load();
  };

  return <div className="space-y-4 rounded-lg border bg-card p-4"><h2 className="text-xl font-semibold">Asset Depreciation</h2><div className="grid gap-3 md:grid-cols-5"><Input value={assetId} onChange={(e)=>setAssetId(e.target.value)} placeholder="Asset ID"/><Input type="date" value={periodDate} onChange={(e)=>setPeriodDate(e.target.value)}/><Input type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="Depresiasi"/><Input type="number" value={bookValue} onChange={(e)=>setBookValue(e.target.value)} placeholder="Book value"/><Button onClick={onAdd}>Tambah Schedule</Button></div>{rows.map((r)=><div key={r.id} className="rounded border px-3 py-2 text-sm">Asset {r.asset_id} - {r.period_date} - Rp {Number(r.depreciation_amount).toLocaleString('id-ID')} (BV {Number(r.book_value_after).toLocaleString('id-ID')}) [{r.status}]</div>)}</div>;
}
