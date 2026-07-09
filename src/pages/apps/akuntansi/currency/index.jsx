import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { akuntansiAdvancedService } from '@/services/akuntansiAdvancedService.js';
import { akuntansiCoreService } from '@/services/akuntansiCoreService.js';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';

export default function CurrencyPage() {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [code, setCode] = useState('USD');
  const [rate, setRate] = useState('');
  const [rows, setRows] = useState([]);
  const [periodBlocked, setPeriodBlocked] = useState(false);

  useEffect(() => {
    let active = true;
    if (!tenant?.id) return () => { active = false; };

    (async () => {
      const [rates, period] = await Promise.all([
        akuntansiAdvancedService.getRates(tenant.id),
        akuntansiCoreService.getPeriodStatusForToday(tenant.id),
      ]);
      if (!active) return;
      setRows(rates);
      setPeriodBlocked(!period.hasPeriod || period.isClosed);
    })();

    return () => {
      active = false;
    };
  }, [tenant?.id]);

  const onAdd = async () => {
    const numericRate = Number(rate);
    if (!code.trim() || !Number.isFinite(numericRate) || numericRate <= 0 || !tenant?.id) return;

    try {
      await akuntansiAdvancedService.createRate(tenant.id, {
        currency_code: code.trim().toUpperCase(),
        rate_date: new Date().toISOString().slice(0, 10),
        rate: numericRate,
      });
      setRate('');
      const [rates, period] = await Promise.all([
        akuntansiAdvancedService.getRates(tenant.id),
        akuntansiCoreService.getPeriodStatusForToday(tenant.id),
      ]);
      setRows(rates);
      setPeriodBlocked(!period.hasPeriod || period.isClosed);
      toast({ title: 'Sukses', description: 'Kurs berhasil disimpan.' });
    } catch (error) {
      toast({ title: 'Gagal menyimpan kurs', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">Multi Currency</h2>

      <div className="grid gap-3 md:grid-cols-3">
        <Input value={code} onChange={(e) => setCode(e.target.value)} />
        <Input
          placeholder="Kurs"
          type="number"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
        <Button onClick={onAdd} disabled={periodBlocked}>Simpan Kurs</Button>
      </div>
      {periodBlocked && <p className="text-xs text-red-600">Periode fiskal aktif tidak tersedia atau sedang ditutup.</p>}

      {rows.map((r) => (
        <div key={r.id} className="flex justify-between rounded border px-3 py-2 text-sm">
          <span>{r.currency_code} ({r.rate_date})</span>
          <span>{Number(r.rate).toLocaleString('id-ID')}</span>
        </div>
      ))}
    </div>
  );
}
