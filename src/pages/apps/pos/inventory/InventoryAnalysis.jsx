import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { inventoryModuleService } from '@/services/inventoryModuleService.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';

export default function InventoryAnalysis() {
  const { tenant } = useTenant();
  const [data, setData] = useState({ totalStockValue: 0, totalProducts: 0, fastMovingCount: 0, slowMovingCount: 0, nonMovingCount: 0, xCount: 0, yCount: 0, zCount: 0, productAnalysis: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant?.id) return;
    setLoading(true);
    inventoryModuleService.getInventoryAnalysis(tenant.id).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [tenant?.id]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Inventory Analysis</h2>
        <p className="text-sm text-muted-foreground">Starter analytics: stock value, turnover, dan FSN tag.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-8 text-sm">
        <div className="rounded border p-3">Stock Value<br /><span className="font-semibold">{Number(data.totalStockValue).toLocaleString('id-ID')}</span></div>
        <div className="rounded border p-3">Products<br /><span className="font-semibold">{data.totalProducts}</span></div>
        <div className="rounded border p-3">Fast Moving<br /><span className="font-semibold">{data.fastMovingCount}</span></div>
        <div className="rounded border p-3">Slow Moving<br /><span className="font-semibold">{data.slowMovingCount}</span></div>
        <div className="rounded border p-3">Non Moving<br /><span className="font-semibold">{data.nonMovingCount}</span></div>
        <div className="rounded border p-3">X Class<br /><span className="font-semibold">{data.xCount}</span></div>
        <div className="rounded border p-3">Y Class<br /><span className="font-semibold">{data.yCount}</span></div>
        <div className="rounded border p-3">Z Class<br /><span className="font-semibold">{data.zCount}</span></div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Produk</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Outbound 30d</TableHead><TableHead className="text-right">Turnover</TableHead><TableHead className="text-right">Avg Age (days)</TableHead><TableHead>FSN</TableHead><TableHead>XYZ</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="h-20 text-center text-muted-foreground">Memuat analisis...</TableCell></TableRow>
            ) : data.productAnalysis.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-20 text-center text-muted-foreground">Belum ada data untuk dianalisis.</TableCell></TableRow>
            ) : data.productAnalysis.map((row) => (
              <TableRow key={row.product_id}>
                <TableCell>{row.name}</TableCell>
                <TableCell className="text-right">{row.qty}</TableCell>
                <TableCell className="text-right">{row.outbound_30d}</TableCell>
                <TableCell className="text-right">{row.turnover30d.toFixed(2)}</TableCell>
                <TableCell className="text-right">{row.avgAgeDays.toFixed(1)}</TableCell>
                <TableCell>{row.fsnTag}</TableCell>
                <TableCell>{row.xyzTag}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
