import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { inventoryModuleService } from '@/services/inventoryModuleService.js';
import { inventoryPageService } from '@/services/inventoryPageService.js';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';

export default function MaterialRequests() {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [line, setLine] = useState({ product_id: '', requested_qty: '' });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const load = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const [reqs, dropdowns] = await Promise.all([
        inventoryModuleService.listMaterialRequests(tenant.id),
        inventoryPageService.getProductsAndLocations(tenant.id),
      ]);
      setRequests(reqs);
      setProducts(dropdowns.products || []);
    } catch (error) {
      setErrorMessage(error.message || 'Gagal memuat material request.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load().catch(console.error); }, [tenant?.id]);

  const submit = async (e) => {
    e.preventDefault();
    if (!line.product_id || Number(line.requested_qty) <= 0) {
      toast({ title: 'Validasi gagal', description: 'Produk dan qty wajib valid.', variant: 'destructive' });
      return;
    }
    await inventoryModuleService.createMaterialRequest({ lines: [{ ...line, requested_qty: Number(line.requested_qty) }] });
    setLine({ product_id: '', requested_qty: '' });
    await load();
  };

  const totalPages = Math.max(1, Math.ceil(requests.length / pageSize));
  const paginatedRequests = requests.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Material Requests</h2>
        <p className="text-sm text-muted-foreground">Ajukan kebutuhan material internal dengan approval flow.</p>
        <p className="text-xs text-muted-foreground">Total rows: {requests.length}</p>
        {loading && <p className="text-xs text-muted-foreground">Memuat data...</p>}
        {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}
      </div>

      <form className="grid gap-2 md:grid-cols-3" onSubmit={submit}>
        <Select value={line.product_id} onValueChange={(value) => setLine((prev) => ({ ...prev, product_id: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Produk" />
          </SelectTrigger>
          <SelectContent>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Qty"
          type="number"
          value={line.requested_qty}
          onChange={(e) => setLine((prev) => ({ ...prev, requested_qty: e.target.value }))}
        />
        <Button type="submit">Create MR</Button>
      </form>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requester</TableHead>
              <TableHead>Catatan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRequests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>{new Date(request.request_date).toLocaleString('id-ID')}</TableCell>
                <TableCell>{request.status}</TableCell>
                <TableCell>{request.m_user_profiles?.full_name || '-'}</TableCell>
                <TableCell>{request.notes || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t p-3">
          <span className="text-xs text-muted-foreground">Total rows: {requests.length}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <span className="text-xs text-muted-foreground">Page {page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
