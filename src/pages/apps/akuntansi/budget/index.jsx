import { useState } from 'react';
import { useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';
import { akuntansiExtendedService } from '@/services/akuntansiExtendedService.js';
import { validateBudget } from '@/utils/accountingValidation.js';
import { downloadCsv } from '@/utils/csvExport.js';

export default function BudgetPage() {
  const [name, setName] = useState('');
  const [planned, setPlanned] = useState('');
  const [actual, setActual] = useState('');
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const { tenant } = useTenant();
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    if (!tenant?.id) return () => { active = false; };
    (async () => {
      const data = await akuntansiExtendedService.getBudgets(tenant.id);
      if (active) setRows(data);
    })();
    return () => { active = false; };
  }, [tenant?.id]);

  const onAdd = () => {
    const p = Number(planned);
    const a = Number(actual || 0);
    const validation = validateBudget({ cost_center: name, planned_amount: p, actual_amount: a });
    if (!validation.valid) return;
    if (!tenant?.id) return;
    akuntansiExtendedService.createBudget(tenant.id, { cost_center: name.trim(), planned_amount: p, actual_amount: a })
      .then(() => akuntansiExtendedService.getBudgets(tenant.id))
      .then((data) => {
        setRows(data);
        setName('');
        setPlanned('');
        setActual('');
        toast({ title: 'Sukses', description: 'Budget tersimpan.' });
      })
      .catch((err) => toast({ title: 'Gagal simpan budget', description: err.message, variant: 'destructive' }));
  };

  const filtered = rows.filter((r) => r.cost_center.toLowerCase().includes(search.toLowerCase()));
  const exportCsv = () => {
    const rowsCsv = [['Cost Center', 'Planned', 'Actual', 'Variance'], ...filtered.map((r) => [r.cost_center, r.planned_amount, r.actual_amount, Number(r.actual_amount) - Number(r.planned_amount)])];
    downloadCsv(`budget-${new Date().toISOString().slice(0, 10)}.csv`, rowsCsv);
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">Budget & Analytic</h2>
      <div className="grid gap-3 md:grid-cols-4">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cost center" />
        <Input value={planned} onChange={(e) => setPlanned(e.target.value)} type="number" placeholder="Budget plan" />
        <Input value={actual} onChange={(e) => setActual(e.target.value)} type="number" placeholder="Actual" />
        <Button onClick={onAdd}>Tambah Budget</Button>
      </div>
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari cost center..." />
      <Button variant="outline" size="sm" onClick={exportCsv}>Export CSV</Button>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada data budget.</p>
      ) : filtered.map((r) => (
        <div key={r.id} className="grid grid-cols-4 rounded border px-3 py-2 text-sm">
          <span>{r.cost_center}</span>
          <span>Plan: {Number(r.planned_amount).toLocaleString('id-ID')}</span>
          <span>Actual: {Number(r.actual_amount).toLocaleString('id-ID')}</span>
          <span>Var: {(Number(r.actual_amount) - Number(r.planned_amount)).toLocaleString('id-ID')}</span>
        </div>
      ))}
    </div>
  );
}
