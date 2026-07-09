import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';
import { akuntansiWorkflowService } from '@/services/akuntansiWorkflowService.js';

export default function AccrualPage() {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [referenceType, setReferenceType] = useState('expense');
  const [accrualDate, setAccrualDate] = useState('');
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState('outgoing');
  const [rows, setRows] = useState([]);

  const load = async () => {
    if (!tenant?.id) return;
    setRows(await akuntansiWorkflowService.getAccrualEntries(tenant.id));
  };

  useEffect(() => { load(); }, [tenant?.id]);

  const onCreate = async () => {
    const numeric = Number(amount);
    if (!tenant?.id || !accrualDate || !Number.isFinite(numeric) || numeric <= 0) return;
    try {
      await akuntansiWorkflowService.createAccrualEntry(tenant.id, {
        reference_type: referenceType,
        reference_id: null,
        accrual_date: accrualDate,
        amount: numeric,
        direction,
        status: 'draft',
      });
      setAmount('');
      setAccrualDate('');
      await load();
      toast({ title: 'Sukses', description: 'Accrual entry dibuat.' });
    } catch (e) {
      toast({ title: 'Gagal membuat accrual', description: e.message, variant: 'destructive' });
    }
  };

  const onPost = async (id) => {
    if (!tenant?.id) return;
    try {
      await akuntansiWorkflowService.postAccrualEntry(tenant.id, id);
      await load();
      toast({ title: 'Sukses', description: 'Accrual diposting ke jurnal.' });
    } catch (e) {
      toast({ title: 'Gagal posting accrual', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">Accrual & Amortization (Baseline)</h2>
      <div className="grid gap-3 md:grid-cols-5">
        <Input value={referenceType} onChange={(e) => setReferenceType(e.target.value)} placeholder="reference type" />
        <Input type="date" value={accrualDate} onChange={(e) => setAccrualDate(e.target.value)} />
        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Nominal" />
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={direction} onChange={(e) => setDirection(e.target.value)}>
          <option value="outgoing">Outgoing</option>
          <option value="incoming">Incoming</option>
        </select>
        <Button onClick={onCreate}>Buat Accrual</Button>
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada accrual entries.</p> : rows.map((r) => (
        <div key={r.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
          <span>{r.reference_type} - {r.accrual_date} - Rp {Number(r.amount).toLocaleString('id-ID')} ({r.direction}) [{r.status}]</span>
          {r.status !== 'posted' && <Button variant="outline" size="sm" onClick={() => onPost(r.id)}>Post</Button>}
        </div>
      ))}
    </div>
  );
}
