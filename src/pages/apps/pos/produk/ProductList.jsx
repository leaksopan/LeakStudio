import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function ProductList() {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Daftar Produk</h2>
                    <p className="text-muted-foreground">Kelola semua produk dan harga jual.</p>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Produk
                </Button>
            </div>

            <div className="rounded-md border p-8 text-center text-muted-foreground">
                Table Produk akan muncul di sini.
            </div>
        </div>
    );
}
