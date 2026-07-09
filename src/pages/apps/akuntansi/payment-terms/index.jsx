import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { akuntansiExtendedService } from '@/services/akuntansiExtendedService.js';
import { validatePaymentTerm } from '@/utils/accountingValidation.js';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';

export default function PaymentTermsPage() {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [dueDays, setDueDays] = useState('');
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!tenant?.id) return () => { active = false; };
    (async () => {
      const data = await akuntansiExtendedService.getPaymentTerms(tenant.id);
      if (active) setRows(data);
    })();
    return () => { active = false; };
  }, [tenant?.id]);

  const onSave = async () => {
    const payload = { name, due_days: Number(dueDays), description };
    const validation = validatePaymentTerm(payload);
    if (!validation.valid) {
      setError(Object.values(validation.errors)[0]);
      return;
    }
    if (!tenant?.id) return;
    setError('');
    try {
      await akuntansiExtendedService.createPaymentTerm(tenant.id, payload);
      setRows(await akuntansiExtendedService.getPaymentTerms(tenant.id));
      setName('');
      setDueDays('');
      setDescription('');
      toast({ title: 'Sukses', description: 'Payment term tersimpan.' });
    } catch (e) {
      toast({ title: 'Gagal simpan payment term', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">Payment Terms</h2>
      <div className="grid gap-3 md:grid-cols-4">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama payment term" />
        <Input value={dueDays} onChange={(e) => setDueDays(e.target.value)} placeholder="Jatuh tempo (hari)" type="number" />
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deskripsi" />
        <Button onClick={onSave}>Simpan</Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada payment term.</p> : rows.map((r) => <div key={r.id} className="rounded border px-3 py-2 text-sm">{r.name} - {r.due_days} hari</div>)}
    </div>
  );
}
