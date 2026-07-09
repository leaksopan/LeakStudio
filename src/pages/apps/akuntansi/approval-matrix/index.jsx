import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';
import { supabase } from '@/lib/supabase.js';

export default function ApprovalMatrixPage() {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [flowType, setFlowType] = useState('payment_voucher');
  const [minAmount, setMinAmount] = useState('0');
  const [requiredRole, setRequiredRole] = useState('manager');
  const [rows, setRows] = useState([]);

  const load = async () => {
    if (!tenant?.id) return;
    const { data, error } = await supabase
      .from('akuntansi_approval_matrix')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('flow_type', { ascending: true })
      .order('min_amount', { ascending: true });
    if (error) throw error;
    setRows(data || []);
  };

  useEffect(() => {
    load().catch(() => {});
  }, [tenant?.id]);

  const onSave = async () => {
    if (!tenant?.id) return;
    const min = Number(minAmount);
    if (!Number.isFinite(min) || min < 0) return;
    const { error } = await supabase
      .from('akuntansi_approval_matrix')
      .upsert({
        tenant_id: tenant.id,
        flow_type: flowType,
        min_amount: min,
        required_role: requiredRole,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id,flow_type,min_amount' });
    if (error) {
      toast({ title: 'Gagal simpan matrix', description: error.message, variant: 'destructive' });
      return;
    }
    await load();
    toast({ title: 'Sukses', description: 'Approval matrix tersimpan.' });
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">Approval Matrix</h2>
      <div className="grid gap-3 md:grid-cols-4">
        <Input value={flowType} onChange={(e) => setFlowType(e.target.value)} placeholder="Flow type" />
        <Input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="Min amount" />
        <Input value={requiredRole} onChange={(e) => setRequiredRole(e.target.value)} placeholder="Required role" />
        <Button onClick={onSave}>Simpan Rule</Button>
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada rule approval.</p> : rows.map((r) => (
        <div key={r.id} className="rounded border px-3 py-2 text-sm">
          {r.flow_type}: min Rp {Number(r.min_amount).toLocaleString('id-ID')} {'→'} {r.required_role}
        </div>
      ))}
    </div>
  );
}
