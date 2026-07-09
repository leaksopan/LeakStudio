import { useEffect, useMemo, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { inventoryPageService } from '@/services/inventoryPageService.js';
import { Input } from '@/components/ui/input.jsx';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { exportCsv } from '@/utils/exportCsv.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.jsx';

export default function StockHistory() {
    const { tenant } = useTenant();
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 20;

    useEffect(() => {
        if (!tenant?.id) return;
        const run = async () => {
            setLoading(true);
            try {
                const data = await inventoryPageService.getMovementHistory(tenant.id);
                setMovements(data);
            } finally {
                setLoading(false);
            }
        };
        run();
    }, [tenant?.id]);

    const filteredMovements = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return movements;
        return movements.filter((row) =>
            row.m_products?.name?.toLowerCase().includes(term)
            || row.m_products?.sku?.toLowerCase().includes(term)
            || row.movement_type?.toLowerCase().includes(term)
        );
    }, [movements, search]);

    const totalPages = Math.max(1, Math.ceil(filteredMovements.length / pageSize));
    const paginatedMovements = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredMovements.slice(start, start + pageSize);
    }, [filteredMovements, page]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Kartu Stok (Riwayat)</h2>
                    <p className="text-muted-foreground">Audit trail semua pergerakan stok (Masuk/Keluar/Jual).</p>
                </div>
            </div>
            <div className="flex items-center py-2">
                <div className="relative w-80">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari produk / tipe movement" className="pl-8" />
                </div>
                <Button
                    variant="outline"
                    className="ml-2"
                    onClick={() => {
                        const rows = filteredMovements.map((row) => [
                            row.created_at,
                            row.movement_type,
                            row.m_products?.name || '',
                            row.m_locations?.name || '',
                            row.qty,
                            row.balance_after,
                        ]);
                        exportCsv('stock-movements.csv', ['Tanggal', 'Tipe', 'Produk', 'Lokasi', 'Qty', 'Balance'], rows);
                    }}
                >
                    Export CSV
                </Button>
            </div>
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Produk</TableHead>
                            <TableHead>Tipe</TableHead>
                            <TableHead>Lokasi</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></TableCell></TableRow>
                        ) : filteredMovements.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Belum ada pergerakan stok.</TableCell></TableRow>
                        ) : paginatedMovements.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>{new Date(row.created_at).toLocaleString('id-ID')}</TableCell>
                                <TableCell>{row.m_products?.name || '-'}</TableCell>
                                <TableCell>{row.movement_type}</TableCell>
                                <TableCell>{row.m_locations?.name || '-'}</TableCell>
                                <TableCell className={`text-right font-semibold ${row.qty < 0 ? 'text-red-600' : 'text-green-700'}`}>{row.qty}</TableCell>
                                <TableCell className="text-right">{row.balance_after}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <div className="flex items-center justify-end gap-2 border-t p-3">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                    <span className="text-xs text-muted-foreground">Page {page} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
            </div>
        </div>
    );
}
