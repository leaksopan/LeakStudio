import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';
import { akuntansiExtendedService } from '@/services/akuntansiExtendedService.js';
import { akuntansiService } from '@/services/akuntansiService.js';
import { Link } from 'react-router-dom';

export default function ArNotesPage() {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedCreditNoteId, setSelectedCreditNoteId] = useState('');
  const [offsetAmount, setOffsetAmount] = useState('');

  useEffect(() => {
    let active = true;
    if (!tenant?.id) return () => { active = false; };
    (async () => {
      const [credit, debit] = await Promise.all([
        akuntansiExtendedService.getCustomerCreditNotes(tenant.id),
        akuntansiExtendedService.getCustomerDebitNotes(tenant.id),
      ]);
      const invs = await akuntansiService.getInvoiceList(tenant.id);
      if (!active) return;
      setNotes([
        ...credit.map((x) => ({ ...x, type: 'credit' })),
        ...debit.map((x) => ({ ...x, type: 'debit' })),
      ]);
      setInvoices(invs);
    })();
    return () => { active = false; };
  }, [tenant?.id]);

  const createNote = async (type) => {
    const numeric = Number(amount);
    if (!tenant?.id || !Number.isFinite(numeric) || numeric <= 0) return;
    const payload = { invoice_id: null, note_number: `${type.toUpperCase()}-${Date.now()}`, amount: numeric, reason };
    try {
      if (type === 'credit') await akuntansiExtendedService.createCustomerCreditNote(tenant.id, payload);
      else await akuntansiExtendedService.createCustomerDebitNote(tenant.id, payload);
      const [credit, debit] = await Promise.all([
        akuntansiExtendedService.getCustomerCreditNotes(tenant.id),
        akuntansiExtendedService.getCustomerDebitNotes(tenant.id),
      ]);
      setNotes([...credit.map((x) => ({ ...x, type: 'credit' })), ...debit.map((x) => ({ ...x, type: 'debit' }))]);
      setAmount('');
      setReason('');
      toast({ title: 'Sukses', description: `${type === 'credit' ? 'Credit' : 'Debit'} note tersimpan.` });
    } catch (e) {
      toast({ title: 'Gagal simpan note', description: e.message, variant: 'destructive' });
    }
  };

  const createOffset = async () => {
    const numeric = Number(offsetAmount);
    if (!tenant?.id || !selectedInvoiceId || !selectedCreditNoteId || !Number.isFinite(numeric) || numeric <= 0) return;
    try {
      await akuntansiExtendedService.createInvoiceOffsetWithRecalc(tenant.id, {
        invoice_id: selectedInvoiceId,
        credit_note_id: selectedCreditNoteId,
        amount: numeric,
      });
      setOffsetAmount('');
      toast({ title: 'Sukses', description: 'Offset invoice dengan credit note berhasil.' });
    } catch (e) {
      toast({ title: 'Gagal offset', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">AR Notes</h2>
      <div>
        <Button asChild variant="outline" size="sm">
          <Link to="../outstanding">Lihat Outstanding AR/AP</Link>
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Nominal" />
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Alasan" />
        <Button onClick={() => createNote('credit')}>Tambah Credit Note</Button>
        <Button variant="outline" onClick={() => createNote('debit')}>Tambah Debit Note</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={selectedInvoiceId} onChange={(e) => setSelectedInvoiceId(e.target.value)}>
          <option value="">Pilih Invoice</option>
          {invoices.map((i) => <option key={i.id} value={i.id}>{i.invoice_number}</option>)}
        </select>
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={selectedCreditNoteId} onChange={(e) => setSelectedCreditNoteId(e.target.value)}>
          <option value="">Pilih Credit Note</option>
          {notes.filter((n) => n.type === 'credit').map((n) => <option key={n.id} value={n.id}>{n.note_number}</option>)}
        </select>
        <Input type="number" value={offsetAmount} onChange={(e) => setOffsetAmount(e.target.value)} placeholder="Nominal Offset" />
        <Button variant="outline" onClick={createOffset}>Offset Invoice</Button>
      </div>
      {notes.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada AR notes.</p> : notes.map((n) => <div key={n.id} className="rounded border px-3 py-2 text-sm">[{n.type.toUpperCase()}] {n.note_number} - Rp {Number(n.amount).toLocaleString('id-ID')}</div>)}
    </div>
  );
}
