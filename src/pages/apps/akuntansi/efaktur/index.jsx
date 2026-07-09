import { useState } from 'react';
import { useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';
import { akuntansiExtendedService } from '@/services/akuntansiExtendedService.js';
import { validateEFakturRange } from '@/utils/accountingValidation.js';
import { downloadCsv } from '@/utils/csvExport.js';

export default function EFakturPage() {
  const [nsfpStart, setNsfpStart] = useState('');
  const [nsfpEnd, setNsfpEnd] = useState('');
  const [error, setError] = useState('');
  const [ranges, setRanges] = useState([]);
  const [search, setSearch] = useState('');
  const { tenant } = useTenant();
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    if (!tenant?.id) return () => { active = false; };
    (async () => {
      const data = await akuntansiExtendedService.getEFakturRanges(tenant.id);
      if (active) setRanges(data);
    })();
    return () => { active = false; };
  }, [tenant?.id]);

  const onAddRange = () => {
    const validation = validateEFakturRange({ nsfp_start: nsfpStart, nsfp_end: nsfpEnd });
    if (!validation.valid) {
      setError(Object.values(validation.errors)[0]);
      return;
    }
    setError('');
    if (!tenant?.id) return;
    akuntansiExtendedService.createEFakturRange(tenant.id, { nsfp_start: nsfpStart, nsfp_end: nsfpEnd })
      .then(() => akuntansiExtendedService.getEFakturRanges(tenant.id))
      .then((data) => {
        setRanges(data);
        setNsfpStart('');
        setNsfpEnd('');
        toast({ title: 'Sukses', description: 'Range e-faktur tersimpan.' });
      })
      .catch((err) => toast({ title: 'Gagal simpan range', description: err.message, variant: 'destructive' }));
  };

  const filtered = ranges.filter((r) => `${r.nsfp_start}-${r.nsfp_end}`.includes(search));
  const exportCsv = () => {
    const rowsCsv = [['NSFP Awal', 'NSFP Akhir'], ...filtered.map((r) => [r.nsfp_start, r.nsfp_end])];
    downloadCsv(`efaktur-range-${new Date().toISOString().slice(0, 10)}.csv`, rowsCsv);
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">E-Faktur</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <Input value={nsfpStart} onChange={(e) => setNsfpStart(e.target.value)} placeholder="NSFP awal" />
        <Input value={nsfpEnd} onChange={(e) => setNsfpEnd(e.target.value)} placeholder="NSFP akhir" />
        <Button onClick={onAddRange}>Simpan Range</Button>
      </div>
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari range NSFP..." />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button variant="outline" size="sm" onClick={exportCsv}>Export CSV</Button>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada range NSFP.</p>
      ) : filtered.map((r) => <div key={r.id} className="rounded border px-3 py-2 text-sm">{r.nsfp_start} - {r.nsfp_end}</div>)}
    </div>
  );
}
