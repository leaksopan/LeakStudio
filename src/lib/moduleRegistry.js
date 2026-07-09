const POS_MODULES = [
  { code: 'pos.dashboard', name: 'Dashboard', icon: 'LayoutDashboard', sort_order: 10 },
  { code: 'pos.kasir', name: 'Kasir', icon: 'ShoppingCart', sort_order: 20 },
  { code: 'pos.produk', name: 'Produk', icon: 'Package', sort_order: 30 },
  { code: 'pos.inventory', name: 'Inventory', icon: 'Warehouse', sort_order: 40 },
  { code: 'pos.laporan', name: 'Laporan', icon: 'BarChart3', sort_order: 50 },
  { code: 'pos.user', name: 'User', icon: 'Users', sort_order: 60 },
  { code: 'pos.pengaturan', name: 'Pengaturan', icon: 'Settings', sort_order: 70 },
];

const AKUNTANSI_MODULES = [
  { code: 'akuntansi.dashboard', name: 'Dashboard', icon: 'LayoutDashboard', sort_order: 10 },
  { code: 'akuntansi.setup-wizard', name: 'Setup Wizard', icon: 'Settings', sort_order: 20 },
  { code: 'akuntansi.health-check', name: 'Health Check', icon: 'Shield', sort_order: 30 },
  { code: 'akuntansi.coa', name: 'Chart of Accounts', icon: 'ListOrdered', sort_order: 40 },
  { code: 'akuntansi.fiscal', name: 'Periode Fiskal', icon: 'Calendar', sort_order: 50 },
  { code: 'akuntansi.invoice', name: 'Invoice', icon: 'Receipt', sort_order: 60 },
  { code: 'akuntansi.receipts', name: 'Receipts', icon: 'Wallet', sort_order: 70 },
  { code: 'akuntansi.vendor-bills', name: 'Vendor Bills', icon: 'FileText', sort_order: 80 },
  { code: 'akuntansi.payment-voucher', name: 'Payment Voucher', icon: 'CreditCard', sort_order: 90 },
  { code: 'akuntansi.approval-matrix', name: 'Approval Matrix', icon: 'Shield', sort_order: 100 },
  { code: 'akuntansi.jurnal', name: 'Jurnal', icon: 'BookOpen', sort_order: 110 },
  { code: 'akuntansi.accrual', name: 'Accrual', icon: 'Calculator', sort_order: 120 },
  { code: 'akuntansi.recurring', name: 'Recurring Journal', icon: 'RefreshCcw', sort_order: 130 },
  { code: 'akuntansi.runner-monitor', name: 'Runner Monitor', icon: 'Zap', sort_order: 140 },
  { code: 'akuntansi.outstanding', name: 'Outstanding AR/AP', icon: 'Wallet', sort_order: 150 },
  { code: 'akuntansi.ageing', name: 'Ageing', icon: 'BarChart3', sort_order: 160 },
  { code: 'akuntansi.partner-ledger', name: 'Partner Ledger', icon: 'BookOpen', sort_order: 170 },
  { code: 'akuntansi.ar-notes', name: 'AR Notes', icon: 'FileText', sort_order: 180 },
  { code: 'akuntansi.ap-notes', name: 'AP Notes', icon: 'FileText', sort_order: 190 },
  { code: 'akuntansi.giro', name: 'Giro', icon: 'CreditCard', sort_order: 200 },
  { code: 'akuntansi.bank-cash', name: 'Bank & Cash', icon: 'Wallet', sort_order: 210 },
  { code: 'akuntansi.bank-reconciliation', name: 'Bank Reconciliation', icon: 'RefreshCcw', sort_order: 220 },
  { code: 'akuntansi.bank-integration', name: 'Bank Integration', icon: 'Database', sort_order: 230 },
  { code: 'akuntansi.assets', name: 'Assets', icon: 'Blocks', sort_order: 240 },
  { code: 'akuntansi.asset-depreciation', name: 'Asset Depreciation', icon: 'BarChart3', sort_order: 250 },
  { code: 'akuntansi.currency', name: 'Currency', icon: 'Globe', sort_order: 260 },
  { code: 'akuntansi.fx-revaluation', name: 'FX Revaluation', icon: 'Globe', sort_order: 270 },
  { code: 'akuntansi.tax', name: 'Tax', icon: 'Calculator', sort_order: 280 },
  { code: 'akuntansi.efaktur', name: 'E-Faktur', icon: 'Receipt', sort_order: 290 },
  { code: 'akuntansi.efaktur-export', name: 'E-Faktur Export', icon: 'FileText', sort_order: 300 },
  { code: 'akuntansi.budget', name: 'Budget', icon: 'Calculator', sort_order: 310 },
  { code: 'akuntansi.cashflow-map', name: 'Cashflow Map', icon: 'BarChart3', sort_order: 320 },
  { code: 'akuntansi.fin-ratio', name: 'Financial Ratio', icon: 'BarChart3', sort_order: 330 },
  { code: 'akuntansi.reports', name: 'Reports', icon: 'BarChart3', sort_order: 340 },
  { code: 'akuntansi.payment-terms', name: 'Payment Terms', icon: 'Calendar', sort_order: 350 },
  { code: 'akuntansi.notifications', name: 'Notifications', icon: 'Bell', sort_order: 360 },
];

const DEFAULT_APP_MODULES = {
  pos: POS_MODULES,
  akuntansi: AKUNTANSI_MODULES,
};

const MODULE_CODE_ALIASES = {
  'pos.stok': 'pos.inventory',
};

function canonicalModuleCode(code) {
  return MODULE_CODE_ALIASES[code] || code;
}

export function getDefaultModulesForApp(appSlug, appId) {
  return (DEFAULT_APP_MODULES[appSlug] || []).map((module) => ({
    ...module,
    id: `default:${module.code}`,
    app_id: appId,
    is_active: true,
    isDefaultModule: true,
  }));
}

export function mergeAppModules(dbModules, defaultModules) {
  const byCode = new Map();

  defaultModules.forEach((module) => {
    byCode.set(module.code, module);
  });

  dbModules.forEach((module) => {
    const code = canonicalModuleCode(module.code);
    const defaults = byCode.get(code);

    byCode.set(code, {
      ...defaults,
      ...module,
      code,
      name: defaults?.name || module.name,
      icon: defaults?.icon || module.icon,
      sort_order: defaults?.sort_order ?? module.sort_order,
      isDefaultModule: false,
    });
  });

  return [...byCode.values()].sort((a, b) => {
    const orderA = Number.isFinite(Number(a.sort_order)) ? Number(a.sort_order) : 999;
    const orderB = Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : 999;
    if (orderA !== orderB) return orderA - orderB;
    return String(a.name || a.code).localeCompare(String(b.name || b.code));
  });
}
