import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { akuntansiExtendedService } from '@/services/akuntansiExtendedService.js';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';

export default function CashflowMapPage() {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [accountType, setAccountType] = useState('income');
  const [group, setGroup] = useState('operating');
  const [rows, setRows] = useState([]);

  const load = async () => {
    if (!tenant?.id) return;
    setRows(await akuntansiExtendedService.getCashflowMappings(tenant.id));
  };

  useEffect(() => {
    load();
  }, [tenant?.id]);

  const onSave = async () => {
    if (!tenant?.id) return;
    try {
      await akuntansiExtendedService.createCashflowMapping(tenant.id, {
        account_type: accountType.trim(),
        cashflow_group: group.trim(),
        is_active: true,
      });
      await load();
      toast({ title: 'Sukses', description: 'Mapping cashflow tersimpan.' });
    } catch (e) {
      toast({ title: 'Gagal simpan mapping', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">Cashflow Mapping</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <Input value={accountType} onChange={(e) => setAccountType(e.target.value)} placeholder="Account type" />
        <Input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="operating/investing/financing" />
        <Button onClick={onSave}>Simpan Mapping</Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada mapping.</p>
      ) : rows.map((r) => (
        <div key={r.id} className="rounded border px-3 py-2 text-sm">
          {r.account_type} {'→'} {r.cashflow_group}
        </div>
      ))}
    </div>
  );
}
