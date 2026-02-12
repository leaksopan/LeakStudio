import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
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
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Lazy-loaded POS modules (code splitting)
const POSDashboard = lazy(() => import('@/pages/apps/pos/dashboard'));
const Kasir = lazy(() => import('@/pages/apps/pos/kasir'));
const Stok = lazy(() => import('@/pages/apps/pos/stok'));
const Laporan = lazy(() => import('@/pages/apps/pos/laporan'));
const Produk = lazy(() => import('@/pages/apps/pos/produk'));
const UserList = lazy(() => import('@/pages/apps/pos/user'));
const Pengaturan = lazy(() => import('@/pages/apps/pos/pengaturan'));

const LazyFallback = () => (
  <div className="flex h-full w-full items-center justify-center p-8">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Suspense fallback={<LazyFallback />}>
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
                <Route path="dashboard" element={<POSDashboard />} />
                <Route path="kasir" element={<Kasir />} />
                <Route path="stok/*" element={<Stok />} />
                <Route path="laporan" element={<Laporan />} />
                <Route path="produk/*" element={<Produk />} />
                <Route path="user" element={<UserList />} />
                <Route path="pengaturan" element={<Pengaturan />} />
              </Route>

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
