import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { akuntansiCoreService } from '@/services/akuntansiCoreService.js';
import { validateCoa } from '@/utils/accountingValidation.js';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';

export default function CoaPage() {
  const { tenant } = useTenant();
  const [form, setForm] = useState({ code: '', name: '', account_type: 'asset', normal_balance: 'debit' });
  const [errors, setErrors] = useState({});
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let active = true;
    if (!tenant?.id) return () => { active = false; };

    (async () => {
      const data = await akuntansiCoreService.getCoa(tenant.id);
      if (!active) return;
      setRows(data);
    })();

    return () => {
      active = false;
    };
  }, [tenant?.id]);

  const onAdd = async () => {
    const v = validateCoa(form);
    if (!v.valid) return setErrors(v.errors);
    if (!tenant?.id) return;
    setErrors({});
    await akuntansiCoreService.createCoa(tenant.id, form);
    setForm({ code: '', name: '', account_type: 'asset', normal_balance: 'debit' });
    setRows(await akuntansiCoreService.getCoa(tenant.id));
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">Chart of Accounts</h2>

      <div className="grid gap-3 md:grid-cols-5">
        <Input
          placeholder="Kode"
          value={form.code}
          onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
        />
        <Input
          placeholder="Nama akun"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        />
        <Input
          placeholder="Tipe akun"
          value={form.account_type}
          onChange={(e) => setForm((p) => ({ ...p, account_type: e.target.value }))}
        />
        <Select
          value={form.normal_balance}
          onValueChange={(value) => setForm((p) => ({ ...p, normal_balance: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Saldo normal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="debit">Debit</SelectItem>
            <SelectItem value="credit">Credit</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={onAdd}>Tambah Akun</Button>
      </div>

      {Object.values(errors).map((x, i) => (
        <p key={i} className="text-xs text-red-600">{x}</p>
      ))}

      {rows.map((r) => (
        <div key={r.id} className="rounded border px-3 py-2 text-sm">
          {r.code} - {r.name} ({r.account_type}, {r.normal_balance})
        </div>
      ))}
    </div>
  );
}
