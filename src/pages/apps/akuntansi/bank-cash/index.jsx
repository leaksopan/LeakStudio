import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { akuntansiAdvancedService } from '@/services/akuntansiAdvancedService.js';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';

export default function BankCashPage() {
  const { tenant } = useTenant();
  const [name, setName] = useState('');
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let active = true;
    if (!tenant?.id) return () => { active = false; };

    (async () => {
      const data = await akuntansiAdvancedService.getBankAccounts(tenant.id);
      if (!active) return;
      setRows(data);
    })();

    return () => {
      active = false;
    };
  }, [tenant?.id]);

  const onAdd = async () => {
    if (!name.trim() || !tenant?.id) return;
    await akuntansiAdvancedService.createBankAccount(tenant.id, { name: name.trim() });
    setName('');
    setRows(await akuntansiAdvancedService.getBankAccounts(tenant.id));
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">Bank & Kas</h2>

      <div className="flex gap-3">
        <Input
          placeholder="Nama akun bank/kas"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button onClick={onAdd}>Tambah</Button>
      </div>

      {rows.map((r) => (
        <div key={r.id} className="rounded border px-3 py-2 text-sm">
          {r.name}
        </div>
      ))}
    </div>
  );
}
