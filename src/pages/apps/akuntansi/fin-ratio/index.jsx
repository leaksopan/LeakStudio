import { useMemo, useState } from 'react';
import { useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';
import { akuntansiExtendedService } from '@/services/akuntansiExtendedService.js';
import { downloadCsv } from '@/utils/csvExport.js';

export default function FinancialRatioPage() {
  const [currentAssets, setCurrentAssets] = useState('');
  const [currentLiabilities, setCurrentLiabilities] = useState('');
  const [netIncome, setNetIncome] = useState('');
  const [totalAssets, setTotalAssets] = useState('');
  const [history, setHistory] = useState([]);
  const [searchDate, setSearchDate] = useState('');
  const { tenant } = useTenant();
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    if (!tenant?.id) return () => { active = false; };
    (async () => {
      const data = await akuntansiExtendedService.getFinancialRatios(tenant.id);
      if (active) setHistory(data);
    })();
    return () => { active = false; };
  }, [tenant?.id]);

  const ratios = useMemo(() => {
    const ca = Number(currentAssets || 0);
    const cl = Number(currentLiabilities || 0);
    const ni = Number(netIncome || 0);
    const ta = Number(totalAssets || 0);
    return {
      currentRatio: cl > 0 ? ca / cl : 0,
      roa: ta > 0 ? ni / ta : 0,
    };
  }, [currentAssets, currentLiabilities, netIncome, totalAssets]);

  const onSave = () => {
    if (!tenant?.id) return;
    akuntansiExtendedService
      .createFinancialRatio(tenant.id, {
        current_assets: Number(currentAssets || 0),
        current_liabilities: Number(currentLiabilities || 0),
        net_income: Number(netIncome || 0),
        total_assets: Number(totalAssets || 0),
        current_ratio: ratios.currentRatio,
        roa: ratios.roa,
      })
      .then(() => akuntansiExtendedService.getFinancialRatios(tenant.id))
      .then((data) => {
        setHistory(data);
        toast({ title: 'Sukses', description: 'Rasio keuangan tersimpan.' });
      })
      .catch((err) => toast({ title: 'Gagal simpan rasio', description: err.message, variant: 'destructive' }));
  };

  const filteredHistory = history.filter((h) => {
    if (!searchDate) return true;
    const date = new Date(h.created_at).toISOString().slice(0, 10);
    return date === searchDate;
  });

  const exportCsv = () => {
    const rowsCsv = [
      ['Tanggal', 'Current Ratio', 'ROA'],
      ...filteredHistory.map((h) => [new Date(h.created_at).toISOString().slice(0, 10), Number(h.current_ratio).toFixed(2), (Number(h.roa) * 100).toFixed(2)]),
    ];
    downloadCsv(`financial-ratio-${new Date().toISOString().slice(0, 10)}.csv`, rowsCsv);
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">Rasio Keuangan</h2>
      <div className="grid gap-3 md:grid-cols-4">
        <Input value={currentAssets} onChange={(e) => setCurrentAssets(e.target.value)} type="number" placeholder="Current Assets" />
        <Input value={currentLiabilities} onChange={(e) => setCurrentLiabilities(e.target.value)} type="number" placeholder="Current Liabilities" />
        <Input value={netIncome} onChange={(e) => setNetIncome(e.target.value)} type="number" placeholder="Net Income" />
        <Input value={totalAssets} onChange={(e) => setTotalAssets(e.target.value)} type="number" placeholder="Total Assets" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 text-sm">
        <div className="rounded border px-3 py-2">Current Ratio: {ratios.currentRatio.toFixed(2)}</div>
        <div className="rounded border px-3 py-2">ROA: {(ratios.roa * 100).toFixed(2)}%</div>
      </div>
      <Button variant="outline" onClick={onSave}>Simpan Rasio</Button>
      <Input type="date" value={searchDate} onChange={(e) => setSearchDate(e.target.value)} />
      <Button variant="outline" size="sm" onClick={exportCsv}>Export CSV</Button>
      {filteredHistory.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada histori rasio.</p>
      ) : filteredHistory.map((h) => (
        <div key={h.id} className="grid grid-cols-3 rounded border px-3 py-2 text-sm">
          <span>Current Ratio: {Number(h.current_ratio).toFixed(2)}</span>
          <span>ROA: {(Number(h.roa) * 100).toFixed(2)}%</span>
          <span>{new Date(h.created_at).toLocaleDateString('id-ID')}</span>
        </div>
      ))}
    </div>
  );
}
