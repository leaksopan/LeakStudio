import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { inventoryModuleService } from '@/services/inventoryModuleService.js';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';

export default function OperationTypes() {
  const { tenant } = useTenant();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ code: '', name: '' });

  const load = async () => {
    if (!tenant?.id) return;
    const data = await inventoryModuleService.listOperationTypes(tenant.id);
    setRows(data);
  };

  useEffect(() => { load().catch(console.error); }, [tenant?.id]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) return;
    await inventoryModuleService.createOperationType({ code: form.code.trim().toUpperCase(), name: form.name.trim() });
    setForm({ code: '', name: '' });
    await load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Operation Types</h2>
      <form className="flex gap-2" onSubmit={submit}>
        <Input placeholder="Code (e.g. RECEIVING)" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
        <Input placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        <Button type="submit">Tambah</Button>
      </form>
      <div className="rounded-md border">
        {rows.map((x) => <div key={x.id} className="border-b p-3 text-sm"><span className="font-semibold">{x.code}</span> - {x.name}</div>)}
      </div>
    </div>
  );
}
