import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { akuntansiAdvancedService } from '@/services/akuntansiAdvancedService.js';
import { akuntansiCoreService } from '@/services/akuntansiCoreService.js';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';

export default function AssetsPage() {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [assetName, setAssetName] = useState('');
  const [cost, setCost] = useState('');
  const [rows, setRows] = useState([]);
  const [periodBlocked, setPeriodBlocked] = useState(false);

  useEffect(() => {
    let active = true;
    if (!tenant?.id) return () => { active = false; };

    (async () => {
      const [assets, period] = await Promise.all([
        akuntansiAdvancedService.getAssets(tenant.id),
        akuntansiCoreService.getPeriodStatusForToday(tenant.id),
      ]);
      if (!active) return;
      setRows(assets);
      setPeriodBlocked(!period.hasPeriod || period.isClosed);
    })();

    return () => {
      active = false;
    };
  }, [tenant?.id]);

  const onAdd = async () => {
    const numericCost = Number(cost);
    if (!assetName.trim() || !Number.isFinite(numericCost) || numericCost < 0 || !tenant?.id) return;

    try {
      await akuntansiAdvancedService.createAsset(tenant.id, {
        asset_name: assetName.trim(),
        acquisition_cost: numericCost,
      });
      setAssetName('');
      setCost('');
      const [assets, period] = await Promise.all([
        akuntansiAdvancedService.getAssets(tenant.id),
        akuntansiCoreService.getPeriodStatusForToday(tenant.id),
      ]);
      setRows(assets);
      setPeriodBlocked(!period.hasPeriod || period.isClosed);
      toast({ title: 'Sukses', description: 'Aset berhasil ditambahkan.' });
    } catch (error) {
      toast({ title: 'Gagal menambah aset', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">Aset</h2>

      <div className="grid gap-3 md:grid-cols-3">
        <Input
          placeholder="Nama aset"
          value={assetName}
          onChange={(e) => setAssetName(e.target.value)}
        />
        <Input
          placeholder="Biaya perolehan"
          type="number"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
        />
        <Button onClick={onAdd} disabled={periodBlocked}>Tambah Aset</Button>
      </div>
      {periodBlocked && <p className="text-xs text-red-600">Periode fiskal aktif tidak tersedia atau sedang ditutup.</p>}

      {rows.map((r) => (
        <div key={r.id} className="flex justify-between rounded border px-3 py-2 text-sm">
          <span>{r.asset_name}</span>
          <span>Rp {Number(r.acquisition_cost || 0).toLocaleString('id-ID')}</span>
        </div>
      ))}
    </div>
  );
}
