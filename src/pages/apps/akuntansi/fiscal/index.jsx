import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { akuntansiCoreService } from '@/services/akuntansiCoreService.js';
import { validateFiscalPeriod } from '@/utils/accountingValidation.js';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';

export default function FiscalPage() {
  const { tenant } = useTenant();
  const { isMasterOrAbove } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '' });
  const [errors, setErrors] = useState({});
  const [rows, setRows] = useState([]);
  useEffect(() => {
    let active = true;
    if (!tenant?.id) return () => { active = false; };

    (async () => {
      const data = await akuntansiCoreService.getFiscalPeriods(tenant.id);
      if (!active) return;
      setRows(data);
    })();

    return () => {
      active = false;
    };
  }, [tenant?.id]);

  const onAdd = async () => {
    const v = validateFiscalPeriod(form);
    if (!v.valid) return setErrors(v.errors);
    if (!tenant?.id) return;
    setErrors({});
    await akuntansiCoreService.createFiscalPeriod(tenant.id, form);
    setForm({ name: '', start_date: '', end_date: '' });
    setRows(await akuntansiCoreService.getFiscalPeriods(tenant.id));
  };

  const onClosePeriod = async (periodId) => {
    if (!tenant?.id) return;
    if (!isMasterOrAbove()) {
      return toast({ title: 'Akses ditolak', description: 'Hanya master/superadmin yang bisa menutup periode.', variant: 'destructive' });
    }
    try {
      await akuntansiCoreService.closeFiscalPeriod(tenant.id, periodId);
      setRows(await akuntansiCoreService.getFiscalPeriods(tenant.id));
      toast({ title: 'Sukses', description: 'Periode berhasil ditutup.' });
    } catch (error) {
      toast({ title: 'Gagal menutup periode', description: error.message, variant: 'destructive' });
    }
  };

  const onReopenPeriod = async (periodId) => {
    if (!tenant?.id) return;
    if (!isMasterOrAbove()) {
      return toast({ title: 'Akses ditolak', description: 'Hanya master/superadmin yang bisa membuka periode.', variant: 'destructive' });
    }
    try {
      await akuntansiCoreService.reopenFiscalPeriod(tenant.id, periodId);
      setRows(await akuntansiCoreService.getFiscalPeriods(tenant.id));
      toast({ title: 'Sukses', description: 'Periode berhasil dibuka kembali.' });
    } catch (error) {
      toast({ title: 'Gagal membuka periode', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">Fiscal Period</h2>

      <div className="grid gap-3 md:grid-cols-4">
        <Input
          placeholder="Nama periode"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        />
        <Input
          type="date"
          value={form.start_date}
          onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
        />
        <Input
          type="date"
          value={form.end_date}
          onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
        />
        <Button onClick={onAdd}>Tambah Periode</Button>
      </div>

      {Object.values(errors).map((x, i) => (
        <p key={i} className="text-xs text-red-600">{x}</p>
      ))}

      {rows.map((r) => (
        <div key={r.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
          <div>
            <p className="font-medium">{r.name}</p>
            <p className="text-muted-foreground">
              {r.start_date} - {r.end_date} {r.is_closed ? '(Closed)' : '(Open)'}
            </p>
          </div>
          {!r.is_closed && isMasterOrAbove() && (
            <Button variant="outline" size="sm" onClick={() => onClosePeriod(r.id)}>
              Close Period
            </Button>
          )}
          {r.is_closed && isMasterOrAbove() && (
            <Button variant="outline" size="sm" onClick={() => onReopenPeriod(r.id)}>
              Reopen Period
            </Button>
          )}
          {r.is_closed && !isMasterOrAbove() && <span className="text-xs text-muted-foreground">Sudah ditutup</span>}
        </div>
      ))}
    </div>
  );
}
