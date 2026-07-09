import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { inventoryModuleService } from '@/services/inventoryModuleService.js';
import { supabase } from '@/lib/supabase.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Button } from '@/components/ui/button.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';

export default function DropshipTracking() {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ supplier_id: '', customer_id: '', source_document_type: '', source_document_id: '', notes: '', product_id: '', qty: '', price: '' });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState({ order: null, lines: [], logs: [] });

  const load = async () => {
    if (!tenant?.id) return;
    const [orders, sup, cust, prod] = await Promise.all([
      inventoryModuleService.listDropshipOrders(tenant.id),
      supabase.from('m_suppliers').select('id, name').eq('tenant_id', tenant.id),
      supabase.from('m_customers').select('id, name').eq('tenant_id', tenant.id),
      supabase.from('m_products').select('id, name').eq('tenant_id', tenant.id),
    ]);
    setRows(orders);
    setSuppliers(sup.data || []);
    setCustomers(cust.data || []);
    setProducts(prod.data || []);
  };

  useEffect(() => { load().catch(console.error); }, [tenant?.id]);

  const submit = async (e) => {
    e.preventDefault();
    const qty = Number(form.qty);
    if (!form.supplier_id || !form.customer_id || !form.product_id || !Number.isFinite(qty) || qty <= 0) {
      toast({ title: 'Validasi gagal', description: 'Supplier, customer, produk, dan qty wajib valid.', variant: 'destructive' });
      return;
    }
    await inventoryModuleService.createDropshipOrder({
      supplier_id: form.supplier_id,
      customer_id: form.customer_id,
      source_document_type: form.source_document_type,
      source_document_id: form.source_document_id,
      notes: form.notes,
      lines: [{ product_id: form.product_id, qty, price: Number(form.price || 0) || null }],
    });
    setForm({ supplier_id: '', customer_id: '', source_document_type: '', source_document_id: '', notes: '', product_id: '', qty: '', price: '' });
    toast({ title: 'Sukses', description: 'Dropship order berhasil dibuat.' });
    await load();
  };

  const openDetail = async (orderId) => {
    const data = await inventoryModuleService.getDropshipOrderDetail(orderId);
    setDetail(data);
    setDetailOpen(true);
  };

  const updateStatus = async (orderId, status) => {
    try {
      await inventoryModuleService.updateDropshipStatus(orderId, status);
      toast({ title: 'Updated', description: `Status dropship diubah ke ${status}.` });
      await load();
      if (detail.order?.id === orderId) {
        const data = await inventoryModuleService.getDropshipOrderDetail(orderId);
        setDetail(data);
      }
    } catch (error) {
      toast({ title: 'Gagal update status', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Dropship Tracking</h2>
        <p className="text-sm text-muted-foreground">Tracking direct dropship dari supplier ke customer.</p>
      </div>

      <form onSubmit={submit} className="grid gap-2 md:grid-cols-6">
        <Select value={form.supplier_id} onValueChange={(value) => setForm((p) => ({ ...p, supplier_id: value }))}>
          <SelectTrigger><SelectValue placeholder="Supplier" /></SelectTrigger>
          <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={form.customer_id} onValueChange={(value) => setForm((p) => ({ ...p, customer_id: value }))}>
          <SelectTrigger><SelectValue placeholder="Customer" /></SelectTrigger>
          <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={form.product_id} onValueChange={(value) => setForm((p) => ({ ...p, product_id: value }))}>
          <SelectTrigger><SelectValue placeholder="Produk" /></SelectTrigger>
          <SelectContent>{products.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent>
        </Select>
        <Input placeholder="Qty" type="number" value={form.qty} onChange={(e) => setForm((p) => ({ ...p, qty: e.target.value }))} />
        <Input placeholder="Price" type="number" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} />
        <Button type="submit">Create</Button>
      </form>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Supplier</TableHead><TableHead>Customer</TableHead><TableHead>Source</TableHead><TableHead>Status</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-20 text-center text-muted-foreground">Belum ada data dropship.</TableCell></TableRow>
            ) : rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{new Date(row.created_at).toLocaleString('id-ID')}</TableCell>
                <TableCell>{row.m_suppliers?.name || '-'}</TableCell>
                <TableCell>{row.m_customers?.name || '-'}</TableCell>
                <TableCell>{row.source_document_type || '-'} / {row.source_document_id || '-'}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openDetail(row.id)}>Detail</Button>
                  {row.status === 'submitted' && <Button size="sm" onClick={() => updateStatus(row.id, 'approved')}>Approve</Button>}
                  {row.status === 'approved' && <Button size="sm" onClick={() => updateStatus(row.id, 'shipped')}>Ship</Button>}
                  {row.status === 'shipped' && <Button size="sm" onClick={() => updateStatus(row.id, 'delivered')}>Deliver</Button>}
                  {['draft', 'submitted', 'approved', 'shipped'].includes(row.status) && <Button size="sm" variant="outline" onClick={() => updateStatus(row.id, 'cancelled')}>Cancel</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Dropship Detail</DialogTitle></DialogHeader>
          <p className="text-sm">Status: {detail.order?.status || '-'}</p>
          <div>
            <h4 className="mb-1 text-sm font-semibold">Lines</h4>
            <Table>
              <TableHeader><TableRow><TableHead>Produk</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Price</TableHead></TableRow></TableHeader>
              <TableBody>
                {detail.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>{line.m_products?.name || '-'}</TableCell>
                    <TableCell className="text-right">{line.qty}</TableCell>
                    <TableCell className="text-right">{line.price || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div>
            <h4 className="mb-1 text-sm font-semibold">Status Timeline</h4>
            <Table>
              <TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Action</TableHead><TableHead>Transition</TableHead><TableHead>Note</TableHead></TableRow></TableHeader>
              <TableBody>
                {detail.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{new Date(log.created_at).toLocaleString('id-ID')}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.status_before || '-'} {'→'} {log.status_after || '-'}</TableCell>
                    <TableCell>{log.note || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
