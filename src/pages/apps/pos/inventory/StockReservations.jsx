import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { inventoryModuleService } from '@/services/inventoryModuleService.js';
import { inventoryPageService } from '@/services/inventoryPageService.js';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';

export default function StockReservations() {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({ product_id: '', location_id: '', qty: '', source_type: 'DELIVERY_NOTE' });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const load = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const [reservations, dropdowns] = await Promise.all([
        inventoryModuleService.listReservations(tenant.id),
        inventoryPageService.getProductsAndLocations(tenant.id),
      ]);
      setRows(reservations);
      setProducts(dropdowns.products || []);
      setLocations(dropdowns.locations || []);
    } catch (error) {
      setErrorMessage(error.message || 'Gagal memuat stock reservations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(console.error);
  }, [tenant?.id]);

  const submit = async (e) => {
    e.preventDefault();
    const qty = Number(form.qty);
    if (!form.product_id || !form.location_id || !Number.isFinite(qty) || qty <= 0) {
      toast({ title: 'Validasi gagal', description: 'Lengkapi produk, lokasi, dan qty > 0.', variant: 'destructive' });
      return;
    }
    await inventoryModuleService.createReservation({ ...form, qty });
    setForm({ product_id: '', location_id: '', qty: '', source_type: 'DELIVERY_NOTE' });
    await load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Stock Reservations</h2>
        <p className="text-sm text-muted-foreground">Reservasi stok berdasarkan dokumen sumber.</p>
        {loading && <p className="text-xs text-muted-foreground">Memuat data...</p>}
        {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}
      </div>

      <form onSubmit={submit} className="grid gap-2 md:grid-cols-5">
        <Select value={form.product_id} onValueChange={(value) => setForm((prev) => ({ ...prev, product_id: value }))}>
          <SelectTrigger><SelectValue placeholder="Produk" /></SelectTrigger>
          <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={form.location_id} onValueChange={(value) => setForm((prev) => ({ ...prev, location_id: value }))}>
          <SelectTrigger><SelectValue placeholder="Lokasi" /></SelectTrigger>
          <SelectContent>{locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
        </Select>
        <Input placeholder="Qty" type="number" value={form.qty} onChange={(e) => setForm((prev) => ({ ...prev, qty: e.target.value }))} />
        <Select value={form.source_type} onValueChange={(value) => setForm((prev) => ({ ...prev, source_type: value }))}>
          <SelectTrigger><SelectValue placeholder="Source Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="DELIVERY_NOTE">Delivery Note</SelectItem>
            <SelectItem value="SALES_ORDER">Sales Order</SelectItem>
            <SelectItem value="INTERNAL_TRANSFER">Internal Transfer</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit">Reserve</Button>
      </form>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Produk</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                  Belum ada reservasi stok. Buat reservasi baru dari dokumen sumber.
                </TableCell>
              </TableRow>
            ) : rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{new Date(row.created_at).toLocaleString('id-ID')}</TableCell>
                <TableCell>{row.m_products?.name}</TableCell>
                <TableCell>{row.m_locations?.name}</TableCell>
                <TableCell className="text-right">{row.qty}</TableCell>
                <TableCell>{row.source_type}</TableCell>
                <TableCell>{row.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
