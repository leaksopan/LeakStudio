import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { akuntansiService } from '@/services/akuntansiService.js';
import { akuntansiCoreService } from '@/services/akuntansiCoreService.js';
import { validateJournalEntry } from '@/utils/accountingValidation.js';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';

export default function JournalEntries() {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [description, setDescription] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [debit, setDebit] = useState('');
  const [credit, setCredit] = useState('');
  const [debitAccountId, setDebitAccountId] = useState('');
  const [creditAccountId, setCreditAccountId] = useState('');
  const [error, setError] = useState('');
  const [journals, setJournals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [periodBlocked, setPeriodBlocked] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!tenant?.id) return;
      const rows = await akuntansiService.getJournalList(tenant.id);
      setJournals(rows);
      const coa = await akuntansiCoreService.getCoa(tenant.id);
      setAccounts(coa);
      const period = await akuntansiCoreService.getPeriodStatusForToday(tenant.id);
      setPeriodBlocked(!period.hasPeriod || period.isClosed);
    };
    load();
  }, [tenant?.id]);

  const onSave = async () => {
    if (periodBlocked) {
      return setError('Periode fiskal aktif tidak tersedia atau sedang ditutup');
    }

    const candidate = validateJournalEntry({
      entry_date: entryDate,
      description,
      lines: [{ debit, credit: 0 }, { debit: 0, credit }],
    });
    if (!candidate.valid) return setError(Object.values(candidate.errors)[0]);
    if (!debitAccountId.trim() || !creditAccountId.trim()) {
      return setError('Akun debit dan kredit wajib diisi');
    }

    setError('');
    try {
      await akuntansiCoreService.createJournalWithLines(tenant.id, {
        entry_date: entryDate,
        description,
        lines: [
          { account_id: debitAccountId.trim(), debit: Number(debit), credit: 0 },
          { account_id: creditAccountId.trim(), debit: 0, credit: Number(credit) },
        ],
      });

      const rows = await akuntansiService.getJournalList(tenant.id);
      setJournals(rows);
      setDescription('');
      setEntryDate('');
      setDebit('');
      setCredit('');
      setDebitAccountId('');
      setCreditAccountId('');
      toast({ title: 'Sukses', description: 'Jurnal berhasil disimpan.' });
    } catch (err) {
      setError(err.message);
      toast({ title: 'Gagal menyimpan jurnal', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">Jurnal Umum</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label>Tanggal Jurnal</Label>
          <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Keterangan</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Akun Debit</Label>
          <Select value={debitAccountId} onValueChange={setDebitAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih akun debit" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.code} - {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Akun Kredit</Label>
          <Select value={creditAccountId} onValueChange={setCreditAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih akun kredit" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.code} - {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Total Debit</Label>
          <Input type="number" value={debit} onChange={(e) => setDebit(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Total Kredit</Label>
          <Input type="number" value={credit} onChange={(e) => setCredit(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {periodBlocked && <p className="text-xs text-red-600">Periode fiskal aktif tidak tersedia atau sedang ditutup.</p>}
      <Button onClick={onSave} disabled={!tenant?.id || periodBlocked}>Simpan Jurnal</Button>
      <div className="space-y-1 border-t pt-4 text-sm">
        {journals.length === 0 ? <p className="text-muted-foreground">Belum ada jurnal.</p> : journals.map((jr) => (
          <div key={jr.id} className="flex items-center justify-between rounded-md border px-3 py-2">
            <span>{jr.entry_date} - {jr.description}</span>
            <span>D {Number(jr.total_debit || 0).toLocaleString('id-ID')} | K {Number(jr.total_credit || 0).toLocaleString('id-ID')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
