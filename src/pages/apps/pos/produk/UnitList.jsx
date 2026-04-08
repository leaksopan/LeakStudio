import { useState, useEffect } from 'react';
import { warehouseService } from '@/services/warehouseService.js';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
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
} from "@/components/ui/dialog.jsx";
import { Plus, Pencil, Trash2, Loader2, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast.jsx';

export default function UnitList() {
    const { toast } = useToast();
    const [uoms, setUoms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingUom, setEditingUom] = useState(null);
    const [formData, setFormData] = useState({ name: '', code: '' });

    useEffect(() => {
        fetchUoms();
    }, []);

    const fetchUoms = async () => {
        try {
            setLoading(true);
            const data = await warehouseService.getUOMs();
            setUoms(data || []);
        } catch (error) {
            console.error('Error fetching UOMs:', error);
            toast({ title: "Error", description: "Gagal memuat satuan.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenChange = (open) => {
        setIsOpen(open);
        if (!open) {
            setEditingUom(null);
            setFormData({ name: '', code: '' });
        }
    };

    const handleEdit = (uom) => {
        setEditingUom(uom);
        setFormData({ name: uom.name, code: uom.code });
        setIsOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Apakah anda yakin ingin menghapus satuan ini?')) return;
        try {
            await warehouseService.deleteUOM(id);
            toast({ title: "Sukses", description: "Satuan berhasil dihapus." });
            fetchUoms();
        } catch (error) {
            console.error('Error deleting UOM:', error);
            toast({ title: "Error", description: "Gagal menghapus satuan.", variant: "destructive" });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.code.trim()) return;

        try {
            setIsSubmitting(true);
            if (editingUom) {
                await warehouseService.updateUOM(editingUom.id, { name: formData.name, code: formData.code });
                toast({ title: "Sukses", description: "Satuan berhasil diperbarui." });
            } else {
                await warehouseService.createUOM({ name: formData.name, code: formData.code });
                toast({ title: "Sukses", description: "Satuan berhasil ditambahkan." });
            }
            setIsOpen(false);
            fetchUoms();
        } catch (error) {
            console.error('Error saving UOM:', error);
            toast({ title: "Error", description: "Gagal menyimpan satuan.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredUoms = uoms.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Satuan (UOM)</h2>
                    <p className="text-muted-foreground">Kelola satuan untuk produk (Pcs, Kg, Liter, dll).</p>
                </div>
                <Button onClick={() => setIsOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Satuan
                </Button>
            </div>

            <div className="flex items-center py-4">
                <div className="relative w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari satuan..."
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
                            <TableHead>Nama Satuan</TableHead>
                            <TableHead>Kode</TableHead>
                            <TableHead className="w-[100px] text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Memuat...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredUoms.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                    Tidak ada satuan ditemukan.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUoms.map((uom) => (
                                <TableRow key={uom.id}>
                                    <TableCell className="font-medium">{uom.name}</TableCell>
                                    <TableCell>{uom.code}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(uom)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(uom.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingUom ? 'Edit Satuan' : 'Tambah Satuan'}</DialogTitle>
                        <DialogDescription>Isi detail satuan di bawah ini.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nama Satuan</label>
                            <Input
                                placeholder="Contoh: Kilogram"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Kode</label>
                            <Input
                                placeholder="Contoh: KG"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                            <Button type="submit" disabled={isSubmitting || !formData.name.trim() || !formData.code.trim()}>
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
