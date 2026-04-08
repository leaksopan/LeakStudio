import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase.js'; // logic might be in service, but we stick to pattern
import { inventoryService } from '@/services/inventoryService.js';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx'; // Need to check if exists, else Input
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table.jsx";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog.jsx";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select.jsx";
import { Plus, History, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast.jsx';

export default function StockOpname() {
    const { tenant } = useTenant();
    const { toast } = useToast();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    // Dialog Data Sources
    const [products, setProducts] = useState([]);
    const [batches, setBatches] = useState([]);
    const [locations, setLocations] = useState([]);

    // Dialog State
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        product_id: '',
        batch_id: '',
        location_id: '',
        adjustment_qty: '', // Can be negative or positive
        reason: '',
        evidence_url: '' // simplified
    });

    useEffect(() => {
        if (tenant) {
            fetchHistory();
            fetchDropdowns();
        }
    }, [tenant]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('t_stock_adjustments')
                .select(`
                    *,
                    m_products ( name ),
                    t_inventory_batches ( batch_number )
                `)
                .eq('tenant_id', tenant.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            setHistory(data || []);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDropdowns = async () => {
        // Fetch basic data for form
        const { data: prods } = await supabase.from('m_products').select('id, name').eq('tenant_id', tenant.id);
        const { data: locs } = await supabase.from('m_locations').select('id, name').eq('tenant_id', tenant.id);
        setProducts(prods || []);
        setLocations(locs || []);
    };

    const handleProductChange = async (productId) => {
        setFormData(prev => ({ ...prev, product_id: productId, batch_id: '' }));
        // Fetch batches for this product
        if (!productId) {
            setBatches([]);
            return;
        }
        const { data } = await supabase
            .from('t_inventory_batches')
            .select('id, batch_number, quantity, m_locations(name)')
            .eq('product_id', productId)
            .gt('quantity', 0); // Only adjust existing batches usually? Or create new batch?
        // Opname typically adjusts EXISTING batch. New batch is "Inbound/Purchase".
        setBatches(data || []);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            await inventoryService.adjustStock({
                product_id: formData.product_id,
                batch_id: formData.batch_id,
                location_id: formData.location_id, // Should match batch location or be explicit
                adjustment_qty: parseFloat(formData.adjustment_qty),
                reason: formData.reason,
                evidence_url: formData.evidence_url
            });

            toast({ title: "Sukses", description: "Stok berhasil disesuaikan." });
            setIsOpen(false);
            setFormData({ product_id: '', batch_id: '', location_id: '', adjustment_qty: '', reason: '', evidence_url: '' });
            fetchHistory();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Stock Opname</h2>
                    <p className="text-muted-foreground">Sesuaikan jumlah stok nyata dengan sistem.</p>
                </div>
                <Button onClick={() => setIsOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Opname Baru
                </Button>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Produk</TableHead>
                            <TableHead>Batch</TableHead>
                            <TableHead>Qty Penyesuaian</TableHead>
                            <TableHead>Alasan</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : history.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    Belum ada riwayat opname.
                                </TableCell>
                            </TableRow>
                        ) : (
                            history.map((adj) => (
                                <TableRow key={adj.id}>
                                    <TableCell>{new Date(adj.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
                                    <TableCell>{adj.m_products?.name}</TableCell>
                                    <TableCell>{adj.t_inventory_batches?.batch_number}</TableCell>
                                    <TableCell className={adj.adjustment_qty > 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                                        {adj.adjustment_qty > 0 ? '+' : ''}{adj.adjustment_qty}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{adj.reason}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Stock Opname Baru</DialogTitle>
                        <DialogDescription>Input penyesuaian stok.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Produk</Label>
                            <Select
                                value={formData.product_id}
                                onValueChange={handleProductChange}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Produk" />
                                </SelectTrigger>
                                <SelectContent>
                                    {products.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {formData.product_id && (
                            <div className="space-y-2">
                                <Label>Batch</Label>
                                <Select
                                    value={formData.batch_id}
                                    onValueChange={val => {
                                        setFormData(prev => ({ ...prev, batch_id: val }));
                                        // Auto select location if possible, for now manual or derived
                                        const b = batches.find(x => x.id === val);
                                        if (b?.m_locations) {
                                            // Ideally we simply use the batch's location ID if we know it
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih Batch" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {batches.map(b => (
                                            <SelectItem key={b.id} value={b.id}>
                                                {b.batch_number} (Sisa: {b.quantity})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Lokasi</Label>
                            <Select
                                value={formData.location_id}
                                onValueChange={val => setFormData(prev => ({ ...prev, location_id: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Lokasi" />
                                </SelectTrigger>
                                <SelectContent>
                                    {locations.map(l => (
                                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Jumlah Penyesuaian (+/-)</Label>
                            <Input
                                type="number"
                                placeholder="Contoh: -5 (Hilang), 10 (Ditemukan)"
                                value={formData.adjustment_qty}
                                onChange={e => setFormData(prev => ({ ...prev, adjustment_qty: e.target.value }))}
                            />
                            <p className="text-xs text-muted-foreground">Gunakan angka negatif untuk pengurangan.</p>
                        </div>

                        <div className="space-y-2">
                            <Label>Alasan</Label>
                            <Input
                                placeholder="Contoh: Barang Rusak, Salah Hitung"
                                value={formData.reason}
                                onChange={e => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Simpan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
