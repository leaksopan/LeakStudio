import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext.jsx';
import { ErrorBoundary } from '@/components/ErrorBoundary.jsx';
import ProtectedRoute from '@/components/auth/ProtectedRoute.jsx';
import AdminRoute from '@/components/auth/AdminRoute.jsx';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Lazy-loaded route modules to keep the entry bundle small.
const LandingPage = lazy(() => import('@/pages/landing/LandingPage.jsx'));
const Login = lazy(() => import('@/pages/auth/Login.jsx'));
const Register = lazy(() => import('@/pages/auth/Register.jsx'));
const DashboardLayout = lazy(() => import('@/components/layout/DashboardLayout.jsx'));
const TenantLayout = lazy(() => import('@/components/layout/TenantLayout.jsx'));
const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard.jsx'));
const TenantList = lazy(() => import('@/pages/dashboard/TenantList.jsx'));
const RoleList = lazy(() => import('@/pages/dashboard/master/RoleList.jsx'));
const ModuleList = lazy(() => import('@/pages/dashboard/master/ModuleList.jsx'));
const UserAccessConfig = lazy(() => import('@/pages/dashboard/master/UserAccessConfig.jsx'));
const AppDashboard = lazy(() => import('@/pages/apps/dashboard/index.jsx'));
const Kasir = lazy(() => import('@/pages/apps/pos/kasir/index.jsx'));
const Inventory = lazy(() => import('@/pages/apps/pos/inventory/index.jsx'));
const Laporan = lazy(() => import('@/pages/apps/pos/laporan/index.jsx'));
const Produk = lazy(() => import('@/pages/apps/pos/produk/index.jsx'));
const UserList = lazy(() => import('@/pages/apps/pos/user/index.jsx'));
const Pengaturan = lazy(() => import('@/pages/apps/pos/pengaturan/index.jsx'));
const AkuntansiInvoice = lazy(() => import('@/pages/apps/akuntansi/invoice/index.jsx'));
const AkuntansiJurnal = lazy(() => import('@/pages/apps/akuntansi/jurnal/index.jsx'));
const AkuntansiReceipts = lazy(() => import('@/pages/apps/akuntansi/receipts/index.jsx'));
const AkuntansiVendorBills = lazy(() => import('@/pages/apps/akuntansi/vendor-bills/index.jsx'));
const AkuntansiGiro = lazy(() => import('@/pages/apps/akuntansi/giro/index.jsx'));
const AkuntansiBankCash = lazy(() => import('@/pages/apps/akuntansi/bank-cash/index.jsx'));
const AkuntansiAssets = lazy(() => import('@/pages/apps/akuntansi/assets/index.jsx'));
const AkuntansiCurrency = lazy(() => import('@/pages/apps/akuntansi/currency/index.jsx'));
const AkuntansiReports = lazy(() => import('@/pages/apps/akuntansi/reports/index.jsx'));
const AkuntansiCoa = lazy(() => import('@/pages/apps/akuntansi/coa/index.jsx'));
const AkuntansiFiscal = lazy(() => import('@/pages/apps/akuntansi/fiscal/index.jsx'));
const AkuntansiTax = lazy(() => import('@/pages/apps/akuntansi/tax/index.jsx'));
const AkuntansiEFaktur = lazy(() => import('@/pages/apps/akuntansi/efaktur/index.jsx'));
const AkuntansiBudget = lazy(() => import('@/pages/apps/akuntansi/budget/index.jsx'));
const AkuntansiBankIntegration = lazy(() => import('@/pages/apps/akuntansi/bank-integration/index.jsx'));
const AkuntansiFinRatio = lazy(() => import('@/pages/apps/akuntansi/fin-ratio/index.jsx'));
const AkuntansiArNotes = lazy(() => import('@/pages/apps/akuntansi/ar-notes/index.jsx'));
const AkuntansiApNotes = lazy(() => import('@/pages/apps/akuntansi/ap-notes/index.jsx'));
const AkuntansiAgeing = lazy(() => import('@/pages/apps/akuntansi/ageing/index.jsx'));
const AkuntansiCashflowMap = lazy(() => import('@/pages/apps/akuntansi/cashflow-map/index.jsx'));
const AkuntansiOutstanding = lazy(() => import('@/pages/apps/akuntansi/outstanding/index.jsx'));
const AkuntansiHealthCheck = lazy(() => import('@/pages/apps/akuntansi/health-check/index.jsx'));
const AkuntansiSetupWizard = lazy(() => import('@/pages/apps/akuntansi/setup-wizard/index.jsx'));
const AkuntansiPaymentTerms = lazy(() => import('@/pages/apps/akuntansi/payment-terms/index.jsx'));
const AkuntansiRecurring = lazy(() => import('@/pages/apps/akuntansi/recurring/index.jsx'));
const AkuntansiPaymentVoucher = lazy(() => import('@/pages/apps/akuntansi/payment-voucher/index.jsx'));
const AkuntansiAccrual = lazy(() => import('@/pages/apps/akuntansi/accrual/index.jsx'));
const AkuntansiRunnerMonitor = lazy(() => import('@/pages/apps/akuntansi/runner-monitor/index.jsx'));
const AkuntansiPartnerLedger = lazy(() => import('@/pages/apps/akuntansi/partner-ledger/index.jsx'));
const AkuntansiApprovalMatrix = lazy(() => import('@/pages/apps/akuntansi/approval-matrix/index.jsx'));
const AkuntansiNotifications = lazy(() => import('@/pages/apps/akuntansi/notifications/index.jsx'));
const AkuntansiBankReconciliation = lazy(() => import('@/pages/apps/akuntansi/bank-reconciliation/index.jsx'));
const AkuntansiEFakturExport = lazy(() => import('@/pages/apps/akuntansi/efaktur-export/index.jsx'));
const AkuntansiFxRevaluation = lazy(() => import('@/pages/apps/akuntansi/fx-revaluation/index.jsx'));
const AkuntansiAssetDepreciation = lazy(() => import('@/pages/apps/akuntansi/asset-depreciation/index.jsx'));

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
                <Route path="dashboard" element={<AppDashboard />} />
                <Route path="kasir" element={<Kasir />} />
                <Route path="inventory/*" element={<Inventory />} />
                <Route path="laporan" element={<Laporan />} />
                <Route path="produk/*" element={<Produk />} />
                <Route path="user" element={<UserList />} />
                <Route path="pengaturan" element={<Pengaturan />} />

                {/* Accounting module routes */}
                <Route path="invoice" element={<AkuntansiInvoice />} />
                <Route path="coa" element={<AkuntansiCoa />} />
                <Route path="fiscal" element={<AkuntansiFiscal />} />
                <Route path="jurnal" element={<AkuntansiJurnal />} />
                <Route path="receipts" element={<AkuntansiReceipts />} />
                <Route path="vendor-bills" element={<AkuntansiVendorBills />} />
                <Route path="giro" element={<AkuntansiGiro />} />
                <Route path="bank-cash" element={<AkuntansiBankCash />} />
                <Route path="assets" element={<AkuntansiAssets />} />
                <Route path="currency" element={<AkuntansiCurrency />} />
                <Route path="reports" element={<AkuntansiReports />} />
                <Route path="tax" element={<AkuntansiTax />} />
                <Route path="efaktur" element={<AkuntansiEFaktur />} />
                <Route path="budget" element={<AkuntansiBudget />} />
                <Route path="bank-integration" element={<AkuntansiBankIntegration />} />
                <Route path="fin-ratio" element={<AkuntansiFinRatio />} />
                <Route path="ar-notes" element={<AkuntansiArNotes />} />
                <Route path="ap-notes" element={<AkuntansiApNotes />} />
                <Route path="ageing" element={<AkuntansiAgeing />} />
                <Route path="cashflow-map" element={<AkuntansiCashflowMap />} />
                <Route path="outstanding" element={<AkuntansiOutstanding />} />
                <Route path="health-check" element={<AkuntansiHealthCheck />} />
                <Route path="setup-wizard" element={<AkuntansiSetupWizard />} />
                <Route path="payment-terms" element={<AkuntansiPaymentTerms />} />
                <Route path="recurring" element={<AkuntansiRecurring />} />
                <Route path="payment-voucher" element={<AkuntansiPaymentVoucher />} />
                <Route path="accrual" element={<AkuntansiAccrual />} />
                <Route path="runner-monitor" element={<AkuntansiRunnerMonitor />} />
                <Route path="partner-ledger" element={<AkuntansiPartnerLedger />} />
                <Route path="approval-matrix" element={<AkuntansiApprovalMatrix />} />
                <Route path="notifications" element={<AkuntansiNotifications />} />
                <Route path="bank-reconciliation" element={<AkuntansiBankReconciliation />} />
                <Route path="efaktur-export" element={<AkuntansiEFakturExport />} />
                <Route path="fx-revaluation" element={<AkuntansiFxRevaluation />} />
                <Route path="asset-depreciation" element={<AkuntansiAssetDepreciation />} />
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
