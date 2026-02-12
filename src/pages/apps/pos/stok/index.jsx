import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import SubModuleLayout from '@/components/layout/SubModuleLayout';
import { Box, ClipboardCheck, ArrowRightLeft, History } from 'lucide-react';

// Sub-pages (Placeholders)
import StockOverview from './StockOverview';
import StockOpname from './StockOpname';
import StockMutasi from './StockMutasi';
import StockHistory from './StockHistory';

export default function StokRouter() {
    const location = useLocation();

    // Base path logic: /t/tenant/pos/stok
    const basePath = location.pathname.split('/stok')[0] + '/stok';

    const items = [
        { title: 'Overview Stok', href: `${basePath}`, icon: Box },
        { title: 'Stock Opname', href: `${basePath}/opname`, icon: ClipboardCheck },
        { title: 'Mutasi / Transfer', href: `${basePath}/mutasi`, icon: ArrowRightLeft },
        { title: 'Kartu Stok (History)', href: `${basePath}/riwayat`, icon: History }
    ];

    return (
        <SubModuleLayout
            title="Manajemen Gudang"
            description="Pantau stok, lakukan opname, dan transfer barang."
            items={items}
        >
            <Routes>
                <Route index element={<StockOverview />} />
                <Route path="opname" element={<StockOpname />} />
                <Route path="mutasi" element={<StockMutasi />} />
                <Route path="riwayat" element={<StockHistory />} />
                <Route path="*" element={<Navigate to="." replace />} />
            </Routes>
        </SubModuleLayout>
    );
}
