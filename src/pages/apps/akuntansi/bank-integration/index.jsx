import { useState } from 'react';
import { useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';
import { akuntansiExtendedService } from '@/services/akuntansiExtendedService.js';
import { downloadCsv } from '@/utils/csvExport.js';

export default function BankIntegrationPage() {
  const [bank, setBank] = useState('BCA');
  const [apiRef, setApiRef] = useState('');
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState('desc');
  const { tenant } = useTenant();
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    if (!tenant?.id) return () => { active = false; };
    (async () => {
      const data = await akuntansiExtendedService.getBankIntegrations(tenant.id);
      if (active) setRows(data);
    })();
    return () => { active = false; };
  }, [tenant?.id]);

  const onLink = () => {
    if (!bank.trim() || !apiRef.trim()) return;
    if (!tenant?.id) return;
    akuntansiExtendedService.createBankIntegration(tenant.id, { bank_name: bank.trim(), api_reference: apiRef.trim(), status: 'linked' })
      .then(() => akuntansiExtendedService.getBankIntegrations(tenant.id))
      .then((data) => {
        setRows(data);
        setApiRef('');
        toast({ title: 'Sukses', description: 'Integrasi bank tersimpan.' });
      })
      .catch((err) => toast({ title: 'Gagal simpan integrasi', description: err.message, variant: 'destructive' }));
  };

  const filtered = rows
    .filter((r) => `${r.bank_name} ${r.api_reference}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = new Date(a.created_at || 0).getTime();
      const bv = new Date(b.created_at || 0).getTime();
      return sortDir === 'asc' ? av - bv : bv - av;
    });

  const exportCsv = () => {
    const rowsCsv = [['Bank', 'API Reference', 'Status'], ...filtered.map((r) => [r.bank_name, r.api_reference, r.status])];
    downloadCsv(`bank-integrations-${new Date().toISOString().slice(0, 10)}.csv`, rowsCsv);
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">Integrasi Bank (BCA/CIMB)</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <Input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Nama bank (BCA/CIMB)" />
        <Input value={apiRef} onChange={(e) => setApiRef(e.target.value)} placeholder="Referensi API" />
        <Button onClick={onLink}>Link Integrasi</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari bank/integrasi..." />
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
          <option value="desc">Terbaru</option>
          <option value="asc">Terlama</option>
        </select>
      </div>
      <Button variant="outline" size="sm" onClick={exportCsv}>Export CSV</Button>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada data integrasi bank.</p>
      ) : filtered.map((r) => <div key={r.id} className="rounded border px-3 py-2 text-sm">{r.bank_name} - {r.api_reference} ({r.status})</div>)}
    </div>
  );
}
