import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { inventoryModuleService } from '@/services/inventoryModuleService.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Button } from '@/components/ui/button.jsx';
import { exportCsv } from '@/utils/exportCsv.js';

export default function ExpiryLowStock() {
  const { tenant } = useTenant();
  const [expiringBatches, setExpiringBatches] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [expiryPage, setExpiryPage] = useState(1);
  const [lowStockPage, setLowStockPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!tenant?.id) return;
    setLoading(true);
    setErrorMessage('');
    inventoryModuleService
      .getExpiryAndLowStock(tenant.id)
      .then((data) => {
        setExpiringBatches(data.expiringBatches || []);
        setLowStock(data.lowStock || []);
      })
      .catch((error) => setErrorMessage(error.message || 'Gagal memuat alert inventory.'))
      .finally(() => setLoading(false));
  }, [tenant?.id]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Expiry & Low Stock Alerts</h2>
        <p className="text-sm text-muted-foreground">Pantau batch yang akan expired dan produk di bawah min stock.</p>
        {loading && <p className="text-xs text-muted-foreground">Memuat data alert...</p>}
        {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}
      </div>

      {(() => {
        const total = Math.max(1, Math.ceil(expiringBatches.length / pageSize));
        const rows = expiringBatches.slice((expiryPage - 1) * pageSize, expiryPage * pageSize);
        return (
      <section className="space-y-2">
        <h3 className="text-lg font-semibold">Upcoming Expiry (60 Hari)</h3>
        <Button
          variant="outline"
          onClick={() => {
            const rows = expiringBatches.map((batch) => [
              batch.m_products?.name || '',
              batch.m_products?.sku || '',
              batch.m_locations?.name || '',
              batch.batch_number || '',
              batch.expiry_date || '',
              batch.quantity || 0,
            ]);
            exportCsv('expiring-batches.csv', ['Produk', 'SKU', 'Lokasi', 'Batch', 'Expiry', 'Qty'], rows);
          }}
        >
          Export Expiry CSV
        </Button>
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Tanggal Expiry</TableHead>
                <TableHead className="text-right">Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell>{batch.m_products?.name}</TableCell>
                  <TableCell>{batch.m_products?.sku || '-'}</TableCell>
                  <TableCell>{batch.m_locations?.name || '-'}</TableCell>
                  <TableCell>{batch.batch_number || '-'}</TableCell>
                  <TableCell>{new Date(batch.expiry_date).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell className="text-right">{batch.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-end gap-2 border-t p-3">
            <Button variant="outline" size="sm" disabled={expiryPage <= 1} onClick={() => setExpiryPage((p) => p - 1)}>Prev</Button>
            <span className="text-xs text-muted-foreground">Page {expiryPage} / {total}</span>
            <Button variant="outline" size="sm" disabled={expiryPage >= total} onClick={() => setExpiryPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </section>
        );
      })()}

      {(() => {
        const total = Math.max(1, Math.ceil(lowStock.length / pageSize));
        const rows = lowStock.slice((lowStockPage - 1) * pageSize, lowStockPage * pageSize);
        return (
      <section className="space-y-2">
        <h3 className="text-lg font-semibold">Low Stock (Below Min Rule)</h3>
        <Button
          variant="outline"
          onClick={() => {
            const rows = lowStock.map((item) => [
              item.m_products?.name || '',
              item.m_locations?.name || '',
              item.current_stock || 0,
              item.min_qty || 0,
              item.shortage || 0,
              item.action_type || '',
            ]);
            exportCsv('low-stock-alerts.csv', ['Produk', 'Lokasi', 'Current', 'Min', 'Shortage', 'Action'], rows);
          }}
        >
          Export Low Stock CSV
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const rows = lowStock.map((item) => [
              item.m_products?.name || '',
              item.m_products?.sku || '',
              item.m_locations?.name || '',
              item.current_stock || 0,
              item.min_qty || 0,
              item.max_qty || 0,
              item.shortage || 0,
              item.action_type || '',
            ]);
            exportCsv('reordering-candidates.csv', ['Produk', 'SKU', 'Lokasi', 'Current', 'Min', 'Max', 'Shortage', 'RecommendedAction'], rows);
          }}
        >
          Export Reorder CSV
        </Button>
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Min Rule</TableHead>
                <TableHead className="text-right">Shortage</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.m_products?.name}</TableCell>
                  <TableCell>{item.m_locations?.name}</TableCell>
                  <TableCell className="text-right">{item.current_stock}</TableCell>
                  <TableCell className="text-right">{item.min_qty}</TableCell>
                  <TableCell className="text-right text-red-600 font-semibold">{item.shortage}</TableCell>
                  <TableCell>{item.action_type}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-end gap-2 border-t p-3">
            <Button variant="outline" size="sm" disabled={lowStockPage <= 1} onClick={() => setLowStockPage((p) => p - 1)}>Prev</Button>
            <span className="text-xs text-muted-foreground">Page {lowStockPage} / {total}</span>
            <Button variant="outline" size="sm" disabled={lowStockPage >= total} onClick={() => setLowStockPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </section>
        );
      })()}
    </div>
  );
}
