import { useEffect, useMemo, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { akuntansiService } from '@/services/akuntansiService.js';
import { akuntansiCoreService } from '@/services/akuntansiCoreService.js';
import { validateCustomerInvoice } from '@/utils/accountingValidation.js';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Link } from 'react-router-dom';

export default function InvoiceManagement() {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [form, setForm] = useState({ customer_id: '', invoice_number: '', amount: '', due_date: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [periodBlocked, setPeriodBlocked] = useState(false);
  const canSubmit = useMemo(() => !saving && !!tenant?.id, [saving, tenant?.id]);

  useEffect(() => {
    const load = async () => {
      if (!tenant?.id) return;
      const rows = await akuntansiService.getInvoiceList(tenant.id, { search });
      setInvoices(rows);
      const period = await akuntansiCoreService.getPeriodStatusForToday(tenant.id);
      setPeriodBlocked(!period.hasPeriod || period.isClosed);
    };
    load();
  }, [tenant?.id, search]);

  const onSubmit = async (event) => {
    event.preventDefault();
    const result = validateCustomerInvoice(form);
    if (!result.valid) return setErrors(result.errors);
    setErrors({});
    setSaving(true);
    try {
      await akuntansiService.createInvoice(tenant.id, result.payload);
      setForm({ customer_id: '', invoice_number: '', amount: '', due_date: '' });
      const rows = await akuntansiService.getInvoiceList(tenant.id, { search });
      setInvoices(rows);
      toast({ title: 'Sukses', description: 'Invoice berhasil disimpan.' });
    } catch (error) {
      toast({ title: 'Gagal menyimpan invoice', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">Manajemen Invoice Customer</h2>
      <div>
        <Button asChild variant="outline" size="sm">
          <Link to="../outstanding">Buka Outstanding AR/AP</Link>
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1"><Label>Customer ID</Label><Input value={form.customer_id} onChange={(e) => setForm((p) => ({ ...p, customer_id: e.target.value }))} />{errors.customer_id && <p className="text-xs text-red-600">{errors.customer_id}</p>}</div>
        <div className="space-y-1"><Label>Nomor Invoice</Label><Input value={form.invoice_number} onChange={(e) => setForm((p) => ({ ...p, invoice_number: e.target.value }))} />{errors.invoice_number && <p className="text-xs text-red-600">{errors.invoice_number}</p>}</div>
        <div className="space-y-1"><Label>Nominal</Label><Input type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />{errors.amount && <p className="text-xs text-red-600">{errors.amount}</p>}</div>
        <div className="space-y-1"><Label>Jatuh Tempo</Label><Input type="date" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} />{errors.due_date && <p className="text-xs text-red-600">{errors.due_date}</p>}</div>
      </div>
      {periodBlocked && <p className="text-xs text-red-600">Periode fiskal aktif tidak tersedia atau sedang ditutup.</p>}
      <Button disabled={!canSubmit || periodBlocked}>{saving ? 'Menyimpan...' : 'Simpan Invoice'}</Button>
      <div className="space-y-2 border-t pt-4">
        <Input placeholder="Cari nomor invoice..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="space-y-1 text-sm">
          {invoices.length === 0 ? <p className="text-muted-foreground">Belum ada data invoice.</p> : invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="font-medium">{inv.invoice_number}</p>
                <p className="text-xs text-muted-foreground">Outstanding: Rp {Number(inv.outstanding_amount || 0).toLocaleString('id-ID')}</p>
                <div className="mt-1">
                  <Badge variant={inv.payment_status === 'paid' ? 'default' : inv.payment_status === 'partial' ? 'secondary' : 'outline'}>
                    {inv.payment_status || 'unpaid'}
                  </Badge>
                </div>
              </div>
              <span>Rp {Number(inv.amount || 0).toLocaleString('id-ID')}</span>
            </div>
          ))}
        </div>
      </div>
    </form>
  );
}
