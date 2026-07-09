import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { akuntansiRecurringService } from '@/services/akuntansiRecurringService.js';

export default function RecurringPage() {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [reversals, setReversals] = useState([]);
  const [templateName, setTemplateName] = useState('');
  const [nextRunDate, setNextRunDate] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [journalId, setJournalId] = useState('');
  const [reversalDate, setReversalDate] = useState('');
  const [runnerDate, setRunnerDate] = useState('');
  const [runLogs, setRunLogs] = useState([]);

  const load = async () => {
    if (!tenant?.id) return;
    const [t, r, logs] = await Promise.all([
      akuntansiRecurringService.getTemplates(tenant.id),
      akuntansiRecurringService.getReversalSchedules(tenant.id),
      akuntansiRecurringService.getRunnerLogs(tenant.id),
    ]);
    setTemplates(t);
    setReversals(r);
    setRunLogs(logs.map((l) => ({
      id: l.id,
      type: l.runner_type,
      date: l.run_date,
      count: l.executed_count,
      status: l.status,
      message: l.message,
    })));
  };

  useEffect(() => {
    load();
  }, [tenant?.id]);

  const createTemplate = async () => {
    if (!tenant?.id || !templateName.trim() || !nextRunDate) return;
    try {
      await akuntansiRecurringService.createTemplate(tenant.id, {
        name: templateName.trim(),
        frequency,
        next_run_date: nextRunDate,
        lines: [],
      });
      setTemplateName('');
      setNextRunDate('');
      await load();
      toast({ title: 'Sukses', description: 'Template recurring tersimpan.' });
    } catch (e) {
      toast({ title: 'Gagal simpan template', description: e.message, variant: 'destructive' });
    }
  };

  const createReversal = async () => {
    if (!tenant?.id || !journalId.trim() || !reversalDate) return;
    try {
      await akuntansiRecurringService.scheduleReversal(tenant.id, {
        journal_entry_id: journalId.trim(),
        reversal_date: reversalDate,
      });
      setJournalId('');
      setReversalDate('');
      await load();
      toast({ title: 'Sukses', description: 'Jadwal reversal tersimpan.' });
    } catch (e) {
      toast({ title: 'Gagal simpan reversal', description: e.message, variant: 'destructive' });
    }
  };

  const runRecurringNow = async () => {
    if (!tenant?.id) return;
    try {
      const result = await akuntansiRecurringService.runDueTemplates(tenant.id, runnerDate || new Date().toISOString().slice(0, 10));
      await load();
      toast({ title: 'Runner selesai', description: `Template dieksekusi: ${result.created_count}` });
      await load();
    } catch (e) {
      toast({ title: 'Gagal jalankan recurring', description: e.message, variant: 'destructive' });
      await akuntansiRecurringService.createRunnerLog(tenant.id, {
        runner_type: 'recurring',
        run_date: runnerDate || new Date().toISOString().slice(0, 10),
        status: 'failed',
        executed_count: 0,
        message: e.message,
      });
      setRunLogs((prev) => [{ id: crypto.randomUUID(), type: 'recurring', date: runnerDate || new Date().toISOString().slice(0, 10), count: 0, status: 'failed', message: e.message }, ...prev].slice(0, 20));
    }
  };

  const runReversalNow = async () => {
    if (!tenant?.id) return;
    try {
      const result = await akuntansiRecurringService.runDueReversals(tenant.id, runnerDate || new Date().toISOString().slice(0, 10));
      await load();
      toast({ title: 'Runner reversal selesai', description: `Reversal dieksekusi: ${result.executed_count}` });
      await load();
    } catch (e) {
      toast({ title: 'Gagal jalankan reversal', description: e.message, variant: 'destructive' });
      await akuntansiRecurringService.createRunnerLog(tenant.id, {
        runner_type: 'reversal',
        run_date: runnerDate || new Date().toISOString().slice(0, 10),
        status: 'failed',
        executed_count: 0,
        message: e.message,
      });
      setRunLogs((prev) => [{ id: crypto.randomUUID(), type: 'reversal', date: runnerDate || new Date().toISOString().slice(0, 10), count: 0, status: 'failed', message: e.message }, ...prev].slice(0, 20));
    }
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">Recurring & Reversal</h2>

      <div className="space-y-2 rounded border p-3">
        <h3 className="font-medium">Template Recurring Journal</h3>
        <div className="grid gap-3 md:grid-cols-4">
          <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Nama template" />
          <Input value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="Frekuensi (monthly/weekly)" />
          <Input type="date" value={nextRunDate} onChange={(e) => setNextRunDate(e.target.value)} />
          <Button onClick={createTemplate}>Simpan Template</Button>
        </div>
        {templates.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada template recurring.</p> : templates.map((t) => (
          <div key={t.id} className="rounded border px-3 py-2 text-sm">{t.name} - {t.frequency} - next: {t.next_run_date}</div>
        ))}
      </div>

      <div className="space-y-2 rounded border p-3">
        <h3 className="font-medium">Jadwal Reversal Journal</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Input value={journalId} onChange={(e) => setJournalId(e.target.value)} placeholder="Journal ID" />
          <Input type="date" value={reversalDate} onChange={(e) => setReversalDate(e.target.value)} />
          <Button onClick={createReversal}>Jadwalkan Reversal</Button>
        </div>
        {reversals.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada jadwal reversal.</p> : reversals.map((r) => (
          <div key={r.id} className="rounded border px-3 py-2 text-sm">Journal {r.journal_entry_id} - reversal: {r.reversal_date} ({r.status})</div>
        ))}
      </div>

      <div className="space-y-2 rounded border p-3">
        <h3 className="font-medium">Manual Runner</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Input type="date" value={runnerDate} onChange={(e) => setRunnerDate(e.target.value)} />
          <Button variant="outline" onClick={runRecurringNow}>Jalankan Recurring</Button>
          <Button variant="outline" onClick={runReversalNow}>Jalankan Reversal</Button>
        </div>
      </div>

      <div className="space-y-2 rounded border p-3">
        <h3 className="font-medium">Riwayat Runner</h3>
        {runLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada riwayat runner pada sesi ini.</p>
        ) : runLogs.map((log) => (
          <div key={log.id} className="rounded border px-3 py-2 text-sm">
            [{log.status}] {log.type} - {log.date} - count: {log.count}{log.message ? ` - ${log.message}` : ''}
          </div>
        ))}
      </div>
    </div>
  );
}
