import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/contexts/TenantContext'; // Assuming tenant context exists as used before
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Download, Loader2, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function StockOverview() {
    const { tenant } = useTenant();
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (tenant) fetchStock();
    }, [tenant]);

    const fetchStock = async () => {
        try {
            setLoading(true);
            // Fetch batches with non-zero quantity (optional, but usually preferred)
            const { data, error } = await supabase
                .from('t_inventory_batches')
                .select(`
                    *,
                    m_products ( name, sku, m_units ( symbol ) ),
                    m_locations ( name )
                `)
                .eq('tenant_id', tenant.id)
                .gt('quantity', 0)
                .order('expiry_date', { ascending: true }); // Expiring first

            if (error) throw error;
            setBatches(data || []);
        } catch (error) {
            console.error('Error fetching stock:', error);
            // Silent error or toast? Toast is better.
        } finally {
            setLoading(false);
        }
    };

    const filteredBatches = batches.filter(b =>
        b.m_products?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.batch_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Overview Stok</h2>
                    <p className="text-muted-foreground">Lihat stok per batch, lokasi, dan tanggal kadaluarsa.</p>
                </div>
                <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                </Button>
            </div>

            <div className="flex items-center py-4">
                <div className="relative w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari produk / batch..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Produk</TableHead>
                            <TableHead>Batch No</TableHead>
                            <TableHead>Lokasi</TableHead>
                            <TableHead>Kadaluarsa</TableHead>
                            <TableHead className="text-right">Stok</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Memuat data stok...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredBatches.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    Tidak ada stok tersedia.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredBatches.map((batch) => (
                                <TableRow key={batch.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{batch.m_products?.name}</span>
                                            <span className="text-xs text-muted-foreground">{batch.m_products?.sku}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{batch.batch_number}</TableCell>
                                    <TableCell>{batch.m_locations?.name || '-'}</TableCell>
                                    <TableCell>
                                        {batch.expiry_date
                                            ? format(new Date(batch.expiry_date), 'dd MMM yyyy')
                                            : '-'}
                                    </TableCell>
                                    <TableCell className="text-right font-bold">
                                        {batch.quantity} {batch.m_products?.m_units?.symbol}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
