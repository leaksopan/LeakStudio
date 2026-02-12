import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function CategoryList() {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Kategori</h2>
                    <p className="text-muted-foreground">Kelompokkan produk untuk kemudahan kasir.</p>
                </div>
                <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Kategori
                </Button>
            </div>
            <div className="rounded-md border p-8 text-center text-muted-foreground">
                Table Kategori akan muncul di sini.
            </div>
        </div>
    );
}
