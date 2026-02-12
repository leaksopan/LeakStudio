import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AdminRoute from '@/components/auth/AdminRoute';
import LandingPage from '@/pages/landing/LandingPage';
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import DashboardLayout from '@/components/layout/DashboardLayout';
import TenantLayout from '@/components/layout/TenantLayout';
import Dashboard from '@/pages/dashboard/Dashboard';
import TenantList from '@/pages/dashboard/TenantList';
import RoleList from '@/pages/dashboard/master/RoleList';
import ModuleList from '@/pages/dashboard/master/ModuleList';
import UserAccessConfig from '@/pages/dashboard/master/UserAccessConfig';
import POSDashboard from '@/pages/apps/pos/dashboard';
import Kasir from '@/pages/apps/pos/kasir';
import Stok from '@/pages/apps/pos/stok';
import Laporan from '@/pages/apps/pos/laporan';
import Produk from '@/pages/apps/pos/produk';
import UserList from '@/pages/apps/pos/user';
import Pengaturan from '@/pages/apps/pos/pengaturan';
import { Toaster } from 'sonner';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 10 * 60 * 1000, // 10 minutes cache
      refetchOnWindowFocus: false, // Default to FALSE to prevent "explode"
      retry: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* SuperAdmin Dashboard */}
          <Route
            path="/dashboard"
            element={
              <AdminRoute>
                <DashboardLayout />
              </AdminRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="tenants" element={<TenantList />} />
            <Route path="settings" element={<div>Settings Page (Coming Soon)</div>} />

            {/* Master Data Routes */}
            <Route path="master/roles" element={<RoleList />} />
            <Route path="master/modules" element={<ModuleList />} />
            <Route path="master/user-access" element={<UserAccessConfig />} />
          </Route>

          {/* Tenant Routes — /t/:tenantSlug/:appSlug/* */}
          <Route
            path="/t/:tenantSlug/:appSlug"
            element={
              <ProtectedRoute>
                <TenantLayout />
              </ProtectedRoute>
            }
          >
            {/* Default redirect to dashboard */}
            <Route index element={<Navigate to="dashboard" replace />} />

            {/* POS page routes */}
            {/* Note: In a real dynamic app, these might be rendered recursively or via a route config */}
            {/* For now, we statically map the known modules to their components */}
            <Route path="dashboard" element={<POSDashboard />} />
            <Route path="kasir" element={<Kasir />} />
            <Route path="stok" element={<Stok />} />
            <Route path="laporan" element={<Laporan />} />
            <Route path="produk" element={<Produk />} />
            <Route path="user" element={<UserList />} />
            <Route path="pengaturan" element={<Pengaturan />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
