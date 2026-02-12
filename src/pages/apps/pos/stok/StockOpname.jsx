import { Button } from '@/components/ui/button';

export default function StockOpname() {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Stock Opname</h2>
                    <p className="text-muted-foreground">Sesuaikan stok fisik dengan sistem (Rusak, Hilang, Ketemu).</p>
                </div>
            </div>
            <div className="rounded-md border p-8 text-center text-muted-foreground">
                Form Opname akan muncul di sini.
            </div>
        </div>
    );
}
