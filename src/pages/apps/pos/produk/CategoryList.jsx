import { useState, useEffect } from 'react';
import { categoryService } from '@/services/productService';
import { useTenant } from '@/contexts/TenantContext';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function CategoryList() {
    const { tenant } = useTenant();
    const { toast } = useToast();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState({ name: '', code: '' });

    useEffect(() => {
        if (tenant) fetchCategories();
    }, [tenant]);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const data = await categoryService.getAll();
            setCategories((data || []).filter(c => c.tenant_id === tenant.id));
        } catch (error) {
            console.error('Error fetching categories:', error);
            toast({ title: "Error", description: "Gagal memuat kategori.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenChange = (open) => {
        setIsOpen(open);
        if (!open) {
            setEditingCategory(null);
            setFormData({ name: '', code: '' });
        }
    };

    const handleEdit = (category) => {
        setEditingCategory(category);
        setFormData({ name: category.name, code: category.code || '' });
        setIsOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Apakah anda yakin ingin menghapus kategori ini?')) return;
        try {
            await categoryService.delete(id);
            toast({ title: "Sukses", description: "Kategori berhasil dihapus." });
            fetchCategories();
        } catch (error) {
            console.error('Error deleting category:', error);
            toast({ title: "Error", description: "Gagal menghapus kategori.", variant: "destructive" });
        }
    };

    const slugify = (str) => str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Auto-suggest kode dari nama kategori (ambil huruf kapital / 3 huruf pertama)
    const suggestCode = (name) => {
        return name
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9\s]/g, '')
            .split(/\s+/)
            .map(w => w[0] || '')
            .join('')
            .slice(0, 5) || name.slice(0, 3).toUpperCase();
    };

    const handleNameChange = (name) => {
        const newFormData = { ...formData, name };
        // Auto-fill kode hanya jika belum diisi manual
        if (!editingCategory && !formData.code) {
            newFormData.code = suggestCode(name);
        }
        setFormData(newFormData);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;
        if (!formData.code.trim()) {
            toast({ title: "Error", description: "Kode kategori wajib diisi.", variant: "destructive" });
            return;
        }

        try {
            setIsSubmitting(true);
            const slug = slugify(formData.name);
            const code = formData.code.trim().toUpperCase();

            if (editingCategory) {
                await categoryService.update(editingCategory.id, { name: formData.name, slug, code });
                toast({ title: "Sukses", description: "Kategori berhasil diperbarui." });
            } else {
                await categoryService.create({ name: formData.name, slug, code, tenant_id: tenant.id });
                toast({ title: "Sukses", description: "Kategori berhasil ditambahkan." });
            }
            setIsOpen(false);
            fetchCategories();
        } catch (error) {
            console.error('Error saving category:', error);
            toast({ title: "Error", description: "Gagal menyimpan kategori.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.code && c.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Kategori Produk</h2>
                    <p className="text-muted-foreground">Kelola kategori untuk pengelompokan produk.</p>
                </div>
                <Button onClick={() => setIsOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Kategori
                </Button>
            </div>

            <div className="flex items-center py-4">
                <div className="relative w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari kategori atau kode..."
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
                            <TableHead>Kode</TableHead>
                            <TableHead>Nama Kategori</TableHead>
                            <TableHead>Contoh SKU</TableHead>
                            <TableHead className="w-[100px] text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Memuat...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredCategories.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    Tidak ada kategori ditemukan.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredCategories.map((category) => (
                                <TableRow key={category.id}>
                                    <TableCell>
                                        <span className="font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded text-sm">
                                            {category.code || '-'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="font-medium">{category.name}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm font-mono">
                                        {category.code ? `${category.code}-001` : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(category.id)}
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
                        <DialogTitle>{editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}</DialogTitle>
                        <DialogDescription>
                            Kode digunakan sebagai prefix SKU produk. Contoh: kode <strong>BVR</strong> → SKU <strong>BVR-001</strong>
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nama Kategori</label>
                            <Input
                                placeholder="Contoh: Makanan, Minuman"
                                value={formData.name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Kode <span className="text-muted-foreground font-normal">(prefix SKU, maks 5 huruf)</span>
                            </label>
                            <Input
                                placeholder="Contoh: BVR, FD, RAW"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().slice(0, 5) })}
                                className="font-mono uppercase"
                                maxLength={5}
                            />
                            {formData.code && (
                                <p className="text-xs text-muted-foreground">
                                    Produk baru di kategori ini akan mendapat SKU: <span className="font-mono font-semibold text-foreground">{formData.code}-001</span>, <span className="font-mono font-semibold text-foreground">{formData.code}-002</span>, dst.
                                </p>
                            )}
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
