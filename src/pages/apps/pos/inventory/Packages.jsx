import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { inventoryModuleService } from '@/services/inventoryModuleService.js';
import { inventoryPageService } from '@/services/inventoryPageService.js';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';

export default function Packages() {
  const { tenant } = useTenant();
  const { hasInventoryAction } = useAuth();
  const [packages, setPackages] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [packageItems, setPackageItems] = useState([]);
  const [itemForm, setItemForm] = useState({ product_id: '', qty: '' });
  const [form, setForm] = useState({ package_code: '', package_type: '', location_id: '' });
  const [packagePage, setPackagePage] = useState(1);
  const [itemPage, setItemPage] = useState(1);
  const pageSize = 15;
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const load = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const [pkgRows, dropdowns] = await Promise.all([
        inventoryModuleService.listPackages(tenant.id),
        inventoryPageService.getProductsAndLocations(tenant.id),
      ]);
      setPackages(pkgRows);
      setLocations(dropdowns.locations || []);
      setProducts(dropdowns.products || []);
    } catch (error) {
      setErrorMessage(error.message || 'Gagal memuat packages.');
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async (packageId) => {
    if (!packageId) {
      setPackageItems([]);
      return;
    }
    const rows = await inventoryModuleService.listPackageItems(packageId);
    setPackageItems(rows);
  };

  useEffect(() => { load().catch(console.error); }, [tenant?.id]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.package_code || !form.location_id) return;
    await inventoryModuleService.createPackage(form);
    setForm({ package_code: '', package_type: '', location_id: '' });
    await load();
  };

  const submitItem = async (e) => {
    e.preventDefault();
    const qty = Number(itemForm.qty);
    if (!selectedPackageId || !itemForm.product_id || !Number.isFinite(qty) || qty <= 0) return;
    await inventoryModuleService.addPackageItem({
      package_id: selectedPackageId,
      product_id: itemForm.product_id,
      qty,
    });
    setItemForm({ product_id: '', qty: '' });
    await loadItems(selectedPackageId);
  };

  const totalPackagePages = Math.max(1, Math.ceil(packages.length / pageSize));
  const paginatedPackages = packages.slice((packagePage - 1) * pageSize, packagePage * pageSize);
  const totalItemPages = Math.max(1, Math.ceil(packageItems.length / pageSize));
  const paginatedItems = packageItems.slice((itemPage - 1) * pageSize, itemPage * pageSize);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Packages</h2>
      <p className="text-xs text-muted-foreground">Total packages: {packages.length}</p>
      {loading && <p className="text-xs text-muted-foreground">Memuat data package...</p>}
      {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}
      {packages.length === 0 && <p className="text-sm text-muted-foreground">Belum ada package. Buat package pertama untuk mulai tracking.</p>}
      <form onSubmit={submit} className="grid gap-2 md:grid-cols-4">
        <Input placeholder="Package Code" value={form.package_code} onChange={(e) => setForm((p) => ({ ...p, package_code: e.target.value }))} />
        <Input placeholder="Package Type" value={form.package_type} onChange={(e) => setForm((p) => ({ ...p, package_type: e.target.value }))} />
        <Select value={form.location_id} onValueChange={(value) => setForm((p) => ({ ...p, location_id: value }))}>
          <SelectTrigger><SelectValue placeholder="Lokasi" /></SelectTrigger>
          <SelectContent>{locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
        </Select>
        <Button type="submit">Create</Button>
      </form>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Type</TableHead><TableHead>Lokasi</TableHead><TableHead>Status</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
          <TableBody>
            {paginatedPackages.map((pkg) => (
              <TableRow key={pkg.id}>
                <TableCell>{pkg.package_code}</TableCell>
                <TableCell>{pkg.package_type || '-'}</TableCell>
                <TableCell>{pkg.m_locations?.name || '-'}</TableCell>
                <TableCell>{pkg.status}</TableCell>
                <TableCell className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setSelectedPackageId(pkg.id); loadItems(pkg.id).catch(console.error); }}>Items</Button>
                  {pkg.status !== 'unpacked' && hasInventoryAction('unpack_package') ? <Button size="sm" variant="outline" onClick={() => inventoryModuleService.unpackPackage(pkg.id).then(load)}>Unpack</Button> : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t p-3">
          <span className="text-xs text-muted-foreground">Total packages: {packages.length}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={packagePage <= 1} onClick={() => setPackagePage((p) => p - 1)}>Prev</Button>
            <span className="text-xs text-muted-foreground">Page {packagePage} / {totalPackagePages}</span>
            <Button variant="outline" size="sm" disabled={packagePage >= totalPackagePages} onClick={() => setPackagePage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </div>

      {selectedPackageId && (
        <div className="space-y-2 rounded-md border bg-card p-3">
          <h3 className="font-semibold">Package Items</h3>
          {packageItems.length === 0 && <p className="text-sm text-muted-foreground">Belum ada item dalam package ini.</p>}
          <form onSubmit={submitItem} className="grid gap-2 md:grid-cols-3">
            <Select value={itemForm.product_id} onValueChange={(value) => setItemForm((prev) => ({ ...prev, product_id: value }))}>
              <SelectTrigger><SelectValue placeholder="Produk" /></SelectTrigger>
              <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="number" placeholder="Qty" value={itemForm.qty} onChange={(e) => setItemForm((prev) => ({ ...prev, qty: e.target.value }))} />
            <Button type="submit">Add Item</Button>
          </form>
          <Table>
            <TableHeader><TableRow><TableHead>Produk</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {paginatedItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.m_products?.name}</TableCell>
                  <TableCell className="text-right">{item.qty}</TableCell>
                  <TableCell><Button size="sm" variant="outline" onClick={() => inventoryModuleService.removePackageItem(item.id).then(() => loadItems(selectedPackageId))}>Hapus</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t p-3">
            <span className="text-xs text-muted-foreground">Total items: {packageItems.length}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={itemPage <= 1} onClick={() => setItemPage((p) => p - 1)}>Prev</Button>
              <span className="text-xs text-muted-foreground">Page {itemPage} / {totalItemPages}</span>
              <Button variant="outline" size="sm" disabled={itemPage >= totalItemPages} onClick={() => setItemPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
