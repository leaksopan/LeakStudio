import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';
import { akuntansiExtendedService } from '@/services/akuntansiExtendedService.js';

export default function ApNotesPage() {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState([]);

  const load = async () => {
    if (!tenant?.id) return;
    setNotes(await akuntansiExtendedService.getVendorDebitNotes(tenant.id));
  };

  useEffect(() => { load(); }, [tenant?.id]);

  const createNote = async () => {
    const numeric = Number(amount);
    if (!tenant?.id || !Number.isFinite(numeric) || numeric <= 0) return;
    try {
      await akuntansiExtendedService.createVendorDebitNote(tenant.id, {
        bill_id: null,
        note_number: `VDN-${Date.now()}`,
        amount: numeric,
        reason,
      });
      await load();
      setAmount('');
      setReason('');
      toast({ title: 'Sukses', description: 'Vendor debit note tersimpan.' });
    } catch (e) {
      toast({ title: 'Gagal simpan vendor note', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">AP Notes</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Nominal" />
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Alasan" />
        <Button onClick={createNote}>Tambah Vendor Debit Note</Button>
      </div>
      {notes.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada AP notes.</p> : notes.map((n) => <div key={n.id} className="rounded border px-3 py-2 text-sm">{n.note_number} - Rp {Number(n.amount).toLocaleString('id-ID')}</div>)}
    </div>
  );
}
