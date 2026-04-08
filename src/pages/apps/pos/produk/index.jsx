import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import SubModuleLayout from '@/components/layout/SubModuleLayout.jsx';
import { Package, Tags, Scale } from 'lucide-react';

// Sub-pages (Will create these next/placeholder for now)
import ProductList from './ProductList.jsx';
import CategoryList from './CategoryList.jsx';
import UnitList from './UnitList.jsx';

const NAVIGATION_ITEMS = [
    {
        title: 'Daftar Produk',
        href: '', // Relative to parent path, handled by logic below? No, easy way is absolute or relative using `.`
        // Ideally we construct full path or use relative. 
        // Since we are in /t/:slug/pos/produk/*
        // Let's use absolute path in component or relative logic.
        // Actually, for simplicity in `SubModuleLayout`, let's check how we pass paths.
        // We will resolve paths in this component.
        icon: Package
    },
    {
        title: 'Kategori',
        href: 'categories',
        icon: Tags
    },
    {
        title: 'Satuan (UOM)',
        href: 'uom',
        icon: Scale
    }
];

export default function ProdukRouter() {
    const location = useLocation();

    // Helper to get base path: /t/tenant/pos/produk
    // We can assume standard structural path, or derive from location
    // e.g. location.pathname ends with .../produk/categories -> base is .../produk

    // Simpler: Just hardcode the relative router context? 
    // SubModuleLayout expects absolute paths for `to` prop in Link usually, or relative if standard Link.
    // Let's construct correct links.

    // HACK: We need the base URL for the Links to work correctly with "isActive" check in Layout
    // If current path is /t/x/y/produk, and we link to 'categories', Link to='categories' works (relative).
    // But comparison needs care.

    // Let's just pass relative paths and let Layout and Link handle it? 
    // `to` in Link is relative to current route if not starting with /.

    // We'll define items with relative paths.

    // BUT SubModuleLayout uses `location.pathname === item.href`. expected absolute.
    // Let's fix SubModuleLayout usage context.

    // To be safe, let's grab the base path.
    const basePath = location.pathname.split('/produk')[0] + '/produk';

    const items = [
        { title: 'Daftar Produk', href: `${basePath}`, icon: Package },
        { title: 'Kategori', href: `${basePath}/categories`, icon: Tags },
        { title: 'Satuan (UOM)', href: `${basePath}/uom`, icon: Scale }
    ];

    return (
        <SubModuleLayout
            title="Manajemen Produk"
            description="Kelola katalog, harga, dan resep produk."
            items={items}
        >
            <Routes>
                <Route index element={<ProductList />} />
                <Route path="categories" element={<CategoryList />} />
                <Route path="uom" element={<UnitList />} />
                <Route path="*" element={<Navigate to="." replace />} />
            </Routes>
        </SubModuleLayout>
    );
}
