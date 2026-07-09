import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { inventoryModuleService } from '@/services/inventoryModuleService.js';
import { inventoryPageService } from '@/services/inventoryPageService.js';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';

export default function ReorderingRules() {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [rules, setRules] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({ product_id: '', location_id: '', min_qty: '', max_qty: '', action_type: 'PR' });

  const load = async () => {
    if (!tenant?.id) return;
    const [r, d] = await Promise.all([
      inventoryModuleService.listReorderingRules(tenant.id),
      inventoryPageService.getProductsAndLocations(tenant.id),
    ]);
    setRules(r); setProducts(d.products || []); setLocations(d.locations || []);
  };
  useEffect(() => { load().catch(console.error); }, [tenant?.id]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.product_id || !form.location_id) {
      toast({ title: 'Validasi gagal', description: 'Produk dan lokasi wajib dipilih.', variant: 'destructive' });
      return;
    }

    const minQty = Number(form.min_qty || 0);
    const maxQty = Number(form.max_qty || 0);
    if (!Number.isFinite(minQty) || !Number.isFinite(maxQty) || minQty < 0 || maxQty < minQty) {
      toast({ title: 'Validasi gagal', description: 'Pastikan min/max valid dan max >= min.', variant: 'destructive' });
      return;
    }

    await inventoryModuleService.createReorderingRule({
      product_id: form.product_id,
      location_id: form.location_id,
      min_qty: minQty,
      max_qty: maxQty,
      action_type: form.action_type,
    });
    setForm({ product_id: '', location_id: '', min_qty: '', max_qty: '', action_type: 'PR' });
    await load();
  };

  const generateAction = async (ruleId) => {
    try {
      const result = await inventoryModuleService.generateReorderAction({ ruleId });
      if (!result.created) {
        toast({ title: 'Tidak ada aksi dibuat', description: result.message || 'Tidak perlu reorder.' });
        return;
      }
      toast({ title: 'Aksi reorder dibuat', description: `${result.type} #${String(result.reference_id).slice(0, 8)} qty ${result.qty}` });
    } catch (error) {
      toast({ title: 'Gagal generate aksi', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Reordering Rules</h2>
        <p className="text-sm text-muted-foreground">Atur minimum dan maksimum stok per produk dan lokasi.</p>
      </div>

      <form onSubmit={submit} className="grid gap-2 md:grid-cols-6">
        <Select value={form.product_id} onValueChange={(value) => setForm((prev) => ({ ...prev, product_id: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Produk" />
          </SelectTrigger>
          <SelectContent>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={form.location_id} onValueChange={(value) => setForm((prev) => ({ ...prev, location_id: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Lokasi" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((location) => (
              <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input placeholder="Min" value={form.min_qty} onChange={(e) => setForm((prev) => ({ ...prev, min_qty: e.target.value }))} />
        <Input placeholder="Max" value={form.max_qty} onChange={(e) => setForm((prev) => ({ ...prev, max_qty: e.target.value }))} />
        <Select value={form.action_type} onValueChange={(value) => setForm((prev) => ({ ...prev, action_type: value }))}>
          <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PR">PR</SelectItem>
            <SelectItem value="MR">MR</SelectItem>
            <SelectItem value="RFQ">RFQ</SelectItem>
            <SelectItem value="PO">PO</SelectItem>
            <SelectItem value="INTERNAL_TRANSFER">Internal Transfer</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit">Simpan</Button>
      </form>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produk</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead className="text-right">Min</TableHead>
              <TableHead className="text-right">Max</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Generate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>{rule.m_products?.name}</TableCell>
                <TableCell>{rule.m_locations?.name}</TableCell>
                <TableCell className="text-right">{rule.min_qty}</TableCell>
                <TableCell className="text-right">{rule.max_qty}</TableCell>
                <TableCell>{rule.action_type}</TableCell>
                <TableCell><Button size="sm" variant="outline" onClick={() => generateAction(rule.id)}>Generate</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
