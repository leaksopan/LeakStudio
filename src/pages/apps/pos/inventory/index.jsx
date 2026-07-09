import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import SubModuleLayout from '@/components/layout/SubModuleLayout.jsx';
import { Box, ClipboardCheck, ArrowRightLeft, History, LayoutDashboard, Settings, RefreshCcw, ClipboardList, Package, Layers, FileText, BellRing, Package2, ListChecks, RotateCcw, Barcode, ChartColumn, Truck, MailWarning } from 'lucide-react';

// Sub-pages (Placeholders)
import InventoryOverview from './StockOverview.jsx';
import InventoryOpname from './StockOpname.jsx';
import InventoryTransfer from './StockMutasi.jsx';
import InventoryHistory from './StockHistory.jsx';
import InventoryDashboard from './InventoryDashboard.jsx';
import OperationTypes from './OperationTypes.jsx';
import ReorderingRules from './ReorderingRules.jsx';
import MaterialRequests from './MaterialRequests.jsx';
import PickingWaves from './PickingWaves.jsx';
import StockReservations from './StockReservations.jsx';
import Operations from './Operations.jsx';
import ExpiryLowStock from './ExpiryLowStock.jsx';
import Packages from './Packages.jsx';
import ReorderQueue from './ReorderQueue.jsx';
import RmaManagement from './RmaManagement.jsx';
import SerializerRules from './SerializerRules.jsx';
import InventoryAnalysis from './InventoryAnalysis.jsx';
import DropshipTracking from './DropshipTracking.jsx';
import NotificationQueue from './NotificationQueue.jsx';

export default function InventoryRouter() {
    const location = useLocation();

    const basePath = location.pathname.split('/inventory')[0] + '/inventory';

    const items = [
        { title: 'Inventory Dashboard', href: `${basePath}`, icon: LayoutDashboard },
        { title: 'Overview Inventory', href: `${basePath}/overview`, icon: Box },
        { title: 'Opname Inventory', href: `${basePath}/opname`, icon: ClipboardCheck },
        { title: 'Mutasi / Transfer', href: `${basePath}/mutasi`, icon: ArrowRightLeft },
        { title: 'Kartu Stok (History)', href: `${basePath}/riwayat`, icon: History },
        { title: 'Operation Types', href: `${basePath}/operation-types`, icon: Settings },
        { title: 'Reordering Rules', href: `${basePath}/reordering-rules`, icon: RefreshCcw },
        { title: 'Material Requests', href: `${basePath}/material-requests`, icon: ClipboardList },
        { title: 'Stock Reservations', href: `${basePath}/stock-reservations`, icon: Package },
        { title: 'Picking Waves', href: `${basePath}/picking-waves`, icon: Layers },
        { title: 'Operations', href: `${basePath}/operations`, icon: FileText },
        { title: 'Expiry & Low Stock', href: `${basePath}/alerts`, icon: BellRing },
        { title: 'Packages', href: `${basePath}/packages`, icon: Package2 },
        { title: 'Reorder Queue', href: `${basePath}/reorder-queue`, icon: ListChecks },
        { title: 'RMA Management', href: `${basePath}/rma`, icon: RotateCcw },
        { title: 'Serializer Rules', href: `${basePath}/serializer-rules`, icon: Barcode },
        { title: 'Inventory Analysis', href: `${basePath}/analysis`, icon: ChartColumn },
        { title: 'Dropship Tracking', href: `${basePath}/dropship`, icon: Truck },
        { title: 'Notification Queue', href: `${basePath}/notification-queue`, icon: MailWarning },
    ];

    return (
        <SubModuleLayout
            title="Manajemen Inventory"
            description="Pantau inventory, lakukan opname, dan transfer barang."
            items={items}
        >
            <Routes>
                <Route index element={<InventoryDashboard />} />
                <Route path="overview" element={<InventoryOverview />} />
                <Route path="opname" element={<InventoryOpname />} />
                <Route path="mutasi" element={<InventoryTransfer />} />
                <Route path="riwayat" element={<InventoryHistory />} />
                <Route path="operation-types" element={<OperationTypes />} />
                <Route path="reordering-rules" element={<ReorderingRules />} />
                <Route path="material-requests" element={<MaterialRequests />} />
                <Route path="stock-reservations" element={<StockReservations />} />
                <Route path="picking-waves" element={<PickingWaves />} />
                <Route path="operations" element={<Operations />} />
                <Route path="alerts" element={<ExpiryLowStock />} />
                <Route path="packages" element={<Packages />} />
                <Route path="reorder-queue" element={<ReorderQueue />} />
                <Route path="rma" element={<RmaManagement />} />
                <Route path="serializer-rules" element={<SerializerRules />} />
                <Route path="analysis" element={<InventoryAnalysis />} />
                <Route path="dropship" element={<DropshipTracking />} />
                <Route path="notification-queue" element={<NotificationQueue />} />
                <Route path="*" element={<Navigate to="." replace />} />
            </Routes>
        </SubModuleLayout>
    );
}
