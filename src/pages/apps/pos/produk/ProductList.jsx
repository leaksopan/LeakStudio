import { useState, useEffect } from 'react';
import { productService, categoryService } from '@/services/productService.js';
import { warehouseService } from '@/services/warehouseService.js';
import { formatCurrency } from '@/lib/utils.js';
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
import { Plus, Pencil, Trash2, Loader2, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast.jsx';
import ProductFormSheet from './ProductFormSheet.jsx';

export default function ProductList() {
    const { toast } = useToast();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    // Dropdown data — di-fetch sekali di parent, di-pass ke modal sebagai props
    const [categories, setCategories] = useState([]);
    const [uoms, setUoms] = useState([]);
    const [allProducts, setAllProducts] = useState([]);

    useEffect(() => {
        fetchProducts();
        fetchDropdownData();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            // productService.getAll() handles RLS + joins m_categories & m_uoms
            const data = await productService.getAll();
            setProducts(data || []);
            setAllProducts(data || []); // sync allProducts juga
        } catch (error) {
            console.error('Error fetching products:', error);
            toast({ title: "Error", description: "Gagal memuat produk.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const fetchDropdownData = async () => {
        try {
            const [cats, uomList] = await Promise.all([
                categoryService.getAll(),
                warehouseService.getUOMs(),
            ]);
            setCategories(cats || []);
            setUoms(uomList || []);
        } catch (err) {
            console.error('Error fetching dropdown data:', err);
        }
    };

    const handleCreate = () => {
        setEditingProduct(null);
        setIsSheetOpen(true);
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setIsSheetOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Apakah anda yakin ingin menghapus produk ini?')) return;
        try {
            // productService.delete() does soft-delete (sets deleted_at)
            await productService.delete(id);
            toast({ title: "Sukses", description: "Produk berhasil dihapus." });
            fetchProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            toast({ title: "Error", description: "Gagal menghapus produk.", variant: "destructive" });
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Daftar Produk</h2>
                    <p className="text-muted-foreground">Kelola semua produk dan harga jual.</p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Produk
                </Button>
            </div>

            <div className="flex items-center py-4">
                <div className="relative w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari produk (Nama/SKU)..."
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
                            <TableHead>Nama Produk</TableHead>
                            <TableHead>Kategori</TableHead>
                            <TableHead>Harga</TableHead>
                            <TableHead>Stok</TableHead>
                            <TableHead className="w-[100px] text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Memuat...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredProducts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    Tidak ada produk ditemukan.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredProducts.map((product) => (
                                <TableRow key={product.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{product.name}</span>
                                            <span className="text-xs text-muted-foreground">{product.sku}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{product.m_categories?.name || '-'}</TableCell>
                                    <TableCell>
                                        {formatCurrency(product.price)}
                                        <span className="text-xs text-muted-foreground ml-1">
                                            / {product.sales_uom?.code || product.unit || 'pcs'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className={product.track_inventory ? "" : "text-muted-foreground italic"}>
                                            {product.track_inventory ? '0' : 'Non-Stok'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(product)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(product.id)}
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

            <ProductFormSheet
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
                onSaved={() => fetchProducts()}
                product={editingProduct}
                categories={categories}
                uoms={uoms}
                allProducts={allProducts}
            />
        </div>
    );
}
