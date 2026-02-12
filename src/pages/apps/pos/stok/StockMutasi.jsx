import { Button } from '@/components/ui/button';

export default function StockMutasi() {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Mutasi & Transfer</h2>
                    <p className="text-muted-foreground">Pindahkan stok antar lokasi atau unit bisnis.</p>
                </div>
                <Button>
                    Buat Request Transfer
                </Button>
            </div>
            <div className="rounded-md border p-8 text-center text-muted-foreground">
                List Mutasi akan muncul di sini.
            </div>
        </div>
    );
}
