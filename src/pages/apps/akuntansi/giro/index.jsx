import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { akuntansiAdvancedService } from '@/services/akuntansiAdvancedService.js';
import { akuntansiCoreService } from '@/services/akuntansiCoreService.js';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';

export default function GiroPage() {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [giroNumber, setGiroNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [rows, setRows] = useState([]);
  const [periodBlocked, setPeriodBlocked] = useState(false);

  useEffect(() => {
    let active = true;
    if (!tenant?.id) return () => { active = false; };

    (async () => {
      const [giroRows, period] = await Promise.all([
        akuntansiAdvancedService.getGiro(tenant.id),
        akuntansiCoreService.getPeriodStatusForToday(tenant.id),
      ]);
      if (!active) return;
      setRows(giroRows);
      setPeriodBlocked(!period.hasPeriod || period.isClosed);
    })();

    return () => {
      active = false;
    };
  }, [tenant?.id]);

  const onAdd = async () => {
    const numeric = Number(amount);
    if (!giroNumber.trim() || !Number.isFinite(numeric) || numeric <= 0 || !tenant?.id) return;
    try {
      await akuntansiAdvancedService.createGiro(tenant.id, {
        reference_type: 'manual',
        giro_number: giroNumber.trim(),
        amount: numeric,
        status: 'open',
      });
      setGiroNumber('');
      setAmount('');
      const [giroRows, period] = await Promise.all([
        akuntansiAdvancedService.getGiro(tenant.id),
        akuntansiCoreService.getPeriodStatusForToday(tenant.id),
      ]);
      setRows(giroRows);
      setPeriodBlocked(!period.hasPeriod || period.isClosed);
      toast({ title: 'Sukses', description: 'GIRO berhasil ditambahkan.' });
    } catch (error) {
      toast({ title: 'Gagal menambah GIRO', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">GIRO</h2>

      <div className="grid gap-3 md:grid-cols-3">
        <Input
          placeholder="Nomor Giro"
          value={giroNumber}
          onChange={(e) => setGiroNumber(e.target.value)}
        />
        <Input
          placeholder="Nominal"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Button onClick={onAdd} disabled={periodBlocked}>Tambah Giro</Button>
      </div>
      {periodBlocked && <p className="text-xs text-red-600">Periode fiskal aktif tidak tersedia atau sedang ditutup.</p>}

      {rows.map((r) => (
        <div key={r.id} className="flex justify-between rounded border px-3 py-2 text-sm">
          <span>{r.giro_number}</span>
          <span>{r.status}</span>
        </div>
      ))}
    </div>
  );
}
