import { useEffect, useState } from 'react';
import { inventoryModuleService } from '@/services/inventoryModuleService.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { exportCsv } from '@/utils/exportCsv.js';

export default function OperationDetail({ operationId }) {
  const [detail, setDetail] = useState({ operation: null, lines: [], movements: [] });
  const [movementTypeFilter, setMovementTypeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!operationId) return;
    inventoryModuleService.getOperationDetail(operationId).then(setDetail).catch(console.error);
  }, [operationId]);

  if (!operationId) return null;

  const filteredMovements = detail.movements.filter((movement) => {
    if (movementTypeFilter !== 'all' && movement.movement_type !== movementTypeFilter) return false;
    const created = new Date(movement.created_at).getTime();
    if (startDate && created < new Date(startDate).getTime()) return false;
    if (endDate && created > new Date(`${endDate}T23:59:59`).getTime()) return false;
    return true;
  });

  const movementTypes = ['all', ...Array.from(new Set(detail.movements.map((x) => x.movement_type).filter(Boolean)))];

  return (
    <div className="space-y-4 rounded-md border bg-card p-4">
      <div>
        <h3 className="text-lg font-semibold">Operation Detail</h3>
        <p className="text-sm text-muted-foreground">Status: {detail.operation?.status || '-'}</p>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Lines</h4>
        <Table>
          <TableHeader><TableRow><TableHead>Produk</TableHead><TableHead>Dari</TableHead><TableHead>Ke</TableHead><TableHead>Lot</TableHead><TableHead>Serial</TableHead><TableHead>Expiry</TableHead><TableHead className="text-right">Qty</TableHead></TableRow></TableHeader>
          <TableBody>
            {detail.lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>{line.m_products?.name}</TableCell>
                <TableCell>{line.from_location?.name || '-'}</TableCell>
                <TableCell>{line.to_location?.name || '-'}</TableCell>
                <TableCell>{line.lot_number || '-'}</TableCell>
                <TableCell>{line.serial_number || '-'}</TableCell>
                <TableCell>{line.expiry_date || '-'}</TableCell>
                <TableCell className="text-right">{line.qty}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Movement Timeline</h4>
        <div className="grid gap-2 md:grid-cols-3">
          <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
            <SelectTrigger><SelectValue placeholder="Filter Type" /></SelectTrigger>
            <SelectContent>
              {movementTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <Button
          variant="outline"
          onClick={() => {
            const rows = filteredMovements.map((movement) => [
              movement.created_at,
              movement.movement_type,
              movement.m_products?.name || '',
              movement.m_locations?.name || '',
              movement.qty,
              movement.balance_after,
            ]);
            exportCsv(`operation-${operationId}-movements.csv`, ['Tanggal', 'Tipe', 'Produk', 'Lokasi', 'Qty', 'Balance'], rows);
          }}
        >
          Export Timeline CSV
        </Button>
        <Table>
          <TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Tipe</TableHead><TableHead>Produk</TableHead><TableHead>Lokasi</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
          <TableBody>
            {filteredMovements.map((movement) => (
              <TableRow key={movement.id}>
                <TableCell>{new Date(movement.created_at).toLocaleString('id-ID')}</TableCell>
                <TableCell>{movement.movement_type}</TableCell>
                <TableCell>{movement.m_products?.name || '-'}</TableCell>
                <TableCell>{movement.m_locations?.name || '-'}</TableCell>
                <TableCell className="text-right">{movement.qty}</TableCell>
                <TableCell className="text-right">{movement.balance_after}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
