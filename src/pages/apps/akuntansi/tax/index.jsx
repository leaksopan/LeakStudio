import { useState } from 'react';
import { useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';
import { akuntansiExtendedService } from '@/services/akuntansiExtendedService.js';
import { validateTaxConfig } from '@/utils/accountingValidation.js';
import { downloadCsv } from '@/utils/csvExport.js';

export default function TaxPage() {
  const [taxName, setTaxName] = useState('PPN');
  const [rate, setRate] = useState('11');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { tenant } = useTenant();
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    if (!tenant?.id) return () => { active = false; };
    (async () => {
      const data = await akuntansiExtendedService.getTaxConfigs(tenant.id);
      if (active) setRows(data);
    })();
    return () => { active = false; };
  }, [tenant?.id]);

  const onAdd = () => {
    const validation = validateTaxConfig({ name: taxName, rate });
    if (!validation.valid) {
      setError(Object.values(validation.errors)[0]);
      return;
    }
    const numeric = Number(rate);
    setError('');
    if (!tenant?.id) return;
    akuntansiExtendedService.createTaxConfig(tenant.id, { name: taxName.trim(), rate: numeric })
      .then(() => akuntansiExtendedService.getTaxConfigs(tenant.id))
      .then((data) => {
        setRows(data);
        toast({ title: 'Sukses', description: 'Pajak tersimpan.' });
      })
      .catch((err) => toast({ title: 'Gagal simpan pajak', description: err.message, variant: 'destructive' }));
  };

  const filtered = rows
    .filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = new Date(a.created_at || 0).getTime();
      const bv = new Date(b.created_at || 0).getTime();
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const exportCsv = () => {
    const rowsCsv = [
      ['Nama Pajak', 'Tarif'],
      ...filtered.map((r) => [r.name, r.rate]),
    ];
    downloadCsv(`tax-config-${new Date().toISOString().slice(0, 10)}.csv`, rowsCsv);
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">Konfigurasi Pajak</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <Input value={taxName} onChange={(e) => setTaxName(e.target.value)} placeholder="Nama pajak" />
        <Input value={rate} onChange={(e) => setRate(e.target.value)} type="number" placeholder="Tarif (%)" />
        <Button onClick={onAdd}>Tambah Pajak</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Cari pajak..." />
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
          <option value="desc">Terbaru</option>
          <option value="asc">Terlama</option>
        </select>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {paged.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada konfigurasi pajak.</p>
      ) : paged.map((r) => <div key={r.id} className="rounded border px-3 py-2 text-sm">{r.name}: {Number(r.rate).toLocaleString('id-ID')}%</div>)}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Page {page} / {totalPages}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>Export CSV</Button>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
        </div>
      </div>
    </div>
  );
}
