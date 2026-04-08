import { Button } from '@/components/ui/button.jsx';

export default function StockHistory() {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Kartu Stok (Riwayat)</h2>
                    <p className="text-muted-foreground">Audit trail semua pergerakan stok (Masuk/Keluar/Jual).</p>
                </div>
            </div>
            <div className="rounded-md border p-8 text-center text-muted-foreground">
                Table History akan muncul di sini.
            </div>
        </div>
    );
}
