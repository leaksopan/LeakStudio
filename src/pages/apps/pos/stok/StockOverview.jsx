import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function StockOverview() {
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
            <div className="rounded-md border p-8 text-center text-muted-foreground">
                Table Stok (Batch) akan muncul di sini.
            </div>
        </div>
    );
}
