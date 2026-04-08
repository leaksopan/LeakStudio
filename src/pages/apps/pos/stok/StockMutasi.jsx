import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase.js';
import { inventoryService } from '@/services/inventoryService.js';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
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
import { ArrowRightLeft, Loader2, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast.jsx';

export default function StockMutasi() {
    const { tenant } = useTenant();
    const { toast } = useToast();
    const [transfers, setTransfers] = useState([]);
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
        from_location_id: '',
        to_location_id: '',
        qty: '',
        evidence_url: ''
    });

    useEffect(() => {
        if (tenant) {
            fetchTransfers();
            fetchDropdowns();
        }
    }, [tenant]);

    const fetchTransfers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('t_stock_transfers')
                .select(`
                    *,
                    m_products ( name ),
                    t_inventory_batches ( batch_number ),
                    from_loc:from_location_id ( name ),
                    to_loc:to_location_id ( name )
                `)
                .eq('tenant_id', tenant.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            setTransfers(data || []);
        } catch (error) {
            console.error('Error fetching transfers:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDropdowns = async () => {
        const { data: prods } = await supabase.from('m_products').select('id, name').eq('tenant_id', tenant.id);
        const { data: locs } = await supabase.from('m_locations').select('id, name').eq('tenant_id', tenant.id);
        setProducts(prods || []);
        setLocations(locs || []);
    };

    const handleProductChange = async (productId) => {
        setFormData(prev => ({ ...prev, product_id: productId, batch_id: '' }));
        if (!productId) {
            setBatches([]);
            return;
        }
        const { data } = await supabase
            .from('t_inventory_batches')
            .select('id, batch_number, quantity, location_id, m_locations(name)')
            .eq('product_id', productId)
            .gt('quantity', 0);
        setBatches(data || []);
    };

    const handleBatchChange = (batchId) => {
        const batch = batches.find(b => b.id === batchId);
        if (batch) {
            setFormData(prev => ({
                ...prev,
                batch_id: batchId,
                from_location_id: batch.location_id // Auto-set From Location
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.from_location_id === formData.to_location_id) {
            toast({ title: "Error", description: "Lokasi asal dan tujuan tidak boleh sama.", variant: "destructive" });
            return;
        }

        try {
            setIsSubmitting(true);
            const transfer = await inventoryService.requestTransfer({
                product_id: formData.product_id,
                batch_id: formData.batch_id,
                from_location_id: formData.from_location_id,
                to_location_id: formData.to_location_id,
                qty: parseFloat(formData.qty),
                evidence_url: formData.evidence_url
            });

            // Auto-approve for now (Simplified flow)
            await inventoryService.approveTransfer(transfer.id);

            toast({ title: "Sukses", description: "Transfer stok berhasil diproses." });
            setIsOpen(false);
            setFormData({ product_id: '', batch_id: '', from_location_id: '', to_location_id: '', qty: '', evidence_url: '' });
            fetchTransfers();
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
                    <h2 className="text-2xl font-bold tracking-tight">Mutasi Stok</h2>
                    <p className="text-muted-foreground">Pindahkan stok antar lokasi / gudang.</p>
                </div>
                <Button onClick={() => setIsOpen(true)}>
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    Mutasi Baru
                </Button>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Produk</TableHead>
                            <TableHead>Batch</TableHead>
                            <TableHead>Dari</TableHead>
                            <TableHead>Ke</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Memuat...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : transfers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    Belum ada data mutasi.
                                </TableCell>
                            </TableRow>
                        ) : (
                            transfers.map((t) => (
                                <TableRow key={t.id}>
                                    <TableCell>
                                        {new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric' })}
                                    </TableCell>
                                    <TableCell>{t.m_products?.name}</TableCell>
                                    <TableCell>{t.t_inventory_batches?.batch_number}</TableCell>
                                    <TableCell>{t.from_loc?.name}</TableCell>
                                    <TableCell>{t.to_loc?.name}</TableCell>
                                    <TableCell className="text-right font-bold">{t.qty}</TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${t.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {t.status === 'completed' ? 'Selesai' : t.status}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Buat Mutasi Stok</DialogTitle>
                        <DialogDescription>Pindahkan stok dari satu lokasi ke lokasi lain.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Produk</Label>
                            <Select value={formData.product_id} onValueChange={handleProductChange}>
                                <SelectTrigger><SelectValue placeholder="Pilih Produk" /></SelectTrigger>
                                <SelectContent>
                                    {products.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        {formData.product_id && (
                            <div className="space-y-2">
                                <Label>Batch Asal</Label>
                                <Select value={formData.batch_id} onValueChange={handleBatchChange}>
                                    <SelectTrigger><SelectValue placeholder="Pilih Batch" /></SelectTrigger>
                                    <SelectContent>
                                        {batches.map(b => (
                                            <SelectItem key={b.id} value={b.id}>
                                                {b.batch_number} ({b.m_locations?.name} - Sisa: {b.quantity})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Dari Lokasi</Label>
                                <Input value={locations.find(l => l.id === formData.from_location_id)?.name || '-'} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label>Ke Lokasi</Label>
                                <Select value={formData.to_location_id} onValueChange={val => setFormData(prev => ({ ...prev, to_location_id: val }))}>
                                    <SelectTrigger><SelectValue placeholder="Pilih Tujuan" /></SelectTrigger>
                                    <SelectContent>
                                        {locations.filter(l => l.id !== formData.from_location_id).map(l => (
                                            <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Jumlah Pindah</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={formData.qty}
                                onChange={e => setFormData(prev => ({ ...prev, qty: e.target.value }))}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Proses Mutasi
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
