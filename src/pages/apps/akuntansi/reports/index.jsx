import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { akuntansiReportService } from '@/services/akuntansiReportService.js';
import { akuntansiCoreService } from '@/services/akuntansiCoreService.js';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';
import { downloadCsv } from '@/utils/csvExport.js';

export default function ReportsPage() {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [summary, setSummary] = useState({
    profit_loss: { income: 0, expense: 0, net_profit: 0 },
    balance_sheet: { assets: 0, liabilities: 0, equity: 0 },
    cash_flow: { cash_in: 0, cash_out: 0, net_cashflow: 0, classified: { operating: 0, investing: 0, financing: 0 } },
    trial_balance: [],
  });
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [generalLedger, setGeneralLedger] = useState([]);
  const [glTotal, setGlTotal] = useState(0);
  const [glPage, setGlPage] = useState(1);
  const [glPageSize] = useState(20);
  const [glSearch, setGlSearch] = useState('');
  const [debouncedGlSearch, setDebouncedGlSearch] = useState('');
  const [glSortBy, setGlSortBy] = useState('created_at');
  const [glSortDir, setGlSortDir] = useState('desc');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const [data, coa, gl] = await Promise.all([
        akuntansiReportService.getSummary(tenant.id, { dateFrom, dateTo }),
        akuntansiCoreService.getCoa(tenant.id),
        akuntansiReportService.getGeneralLedger(tenant.id, {
          accountId: selectedAccountId || undefined,
          dateFrom,
          dateTo,
          page: glPage,
          pageSize: glPageSize,
          search: debouncedGlSearch,
          sortBy: glSortBy,
          sortDir: glSortDir,
        }),
      ]);
      setSummary(data);
      setAccounts(coa);
      setGeneralLedger(gl.rows);
      setGlTotal(gl.total || 0);
    } catch (error) {
      toast({ title: 'Gagal memuat laporan', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedAccountId('');
    setGlSearch('');
    setGlSortBy('created_at');
    setGlSortDir('desc');
    setGlPage(1);
  };

  const exportTrialBalanceCsv = () => {
    const headers = ['Kode Akun', 'Nama Akun', 'Tipe', 'Saldo Normal', 'Debit', 'Kredit', 'Balance'];
    const rows = summary.trial_balance.map((row) => [
      row.code,
      row.name,
      row.account_type,
      row.normal_balance,
      row.debit,
      row.credit,
      row.balance,
    ]);
    downloadCsv(`trial-balance-${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  };

  const exportSummaryCsv = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Income', summary.profit_loss.income],
      ['Expense', summary.profit_loss.expense],
      ['Net Profit', summary.profit_loss.net_profit],
      ['Assets', summary.balance_sheet.assets],
      ['Liabilities', summary.balance_sheet.liabilities],
      ['Equity', summary.balance_sheet.equity],
    ];
    downloadCsv(`financial-summary-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const exportGeneralLedgerCsv = () => {
    const headers = ['Tanggal', 'Kode Akun', 'Nama Akun', 'Deskripsi', 'Debit', 'Kredit'];
    const rows = generalLedger.map((row) => [
      row.journal?.entry_date || '',
      row.account?.code || '',
      row.account?.name || '',
      row.journal?.description || row.description || '',
      row.debit || 0,
      row.credit || 0,
    ]);
    downloadCsv(`general-ledger-${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedGlSearch(glSearch);
      setGlPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [glSearch]);

  useEffect(() => {
    let active = true;
    if (!tenant?.id) return () => { active = false; };

    (async () => {
      setLoading(true);
      try {
        const [data, coa, gl] = await Promise.all([
          akuntansiReportService.getSummary(tenant.id, { dateFrom, dateTo }),
          akuntansiCoreService.getCoa(tenant.id),
          akuntansiReportService.getGeneralLedger(tenant.id, {
            accountId: selectedAccountId || undefined,
            dateFrom,
            dateTo,
            page: glPage,
            pageSize: glPageSize,
            search: debouncedGlSearch,
            sortBy: glSortBy,
            sortDir: glSortDir,
          }),
        ]);
        if (!active) return;
        setSummary(data);
        setAccounts(coa);
        setGeneralLedger(gl.rows);
        setGlTotal(gl.total || 0);
      } catch (error) {
        if (!active) return;
        toast({ title: 'Gagal memuat laporan', description: error.message, variant: 'destructive' });
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [tenant?.id, glPage, glPageSize, debouncedGlSearch, selectedAccountId, dateFrom, dateTo, glSortBy, glSortDir, toast]);

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">Laporan Keuangan</h2>
      <div className="grid gap-3 md:grid-cols-8">
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <Input placeholder="Cari deskripsi GL" value={glSearch} onChange={(e) => setGlSearch(e.target.value)} />
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={glSortBy} onChange={(e) => setGlSortBy(e.target.value)}>
          <option value="created_at">Sort: Created At</option>
          <option value="debit">Sort: Debit</option>
          <option value="credit">Sort: Credit</option>
        </select>
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={glSortDir} onChange={(e) => setGlSortDir(e.target.value)}>
          <option value="desc">DESC</option>
          <option value="asc">ASC</option>
        </select>
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)}>
          <option value="">Semua akun (GL)</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>{account.code} - {account.name}</option>
          ))}
        </select>
        <Button onClick={load} disabled={loading}>{loading ? 'Memuat...' : 'Terapkan Filter'}</Button>
        <Button variant="outline" onClick={resetFilters}>Reset Filter</Button>
        <Button variant="outline" onClick={exportTrialBalanceCsv}>Export Trial Balance CSV</Button>
        <Button variant="outline" onClick={exportSummaryCsv}>Export Summary CSV</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded border p-3">Pendapatan: Rp {Number(summary.profit_loss.income || 0).toLocaleString('id-ID')}</div>
        <div className="rounded border p-3">Beban: Rp {Number(summary.profit_loss.expense || 0).toLocaleString('id-ID')}</div>
        <div className="rounded border p-3">Laba Bersih: Rp {Number(summary.profit_loss.net_profit || 0).toLocaleString('id-ID')}</div>
        <div className="rounded border p-3">Aset: Rp {Number(summary.balance_sheet.assets || 0).toLocaleString('id-ID')}</div>
        <div className="rounded border p-3">Liabilitas: Rp {Number(summary.balance_sheet.liabilities || 0).toLocaleString('id-ID')}</div>
        <div className="rounded border p-3">Ekuitas: Rp {Number(summary.balance_sheet.equity || 0).toLocaleString('id-ID')}</div>
        <div className="rounded border p-3">Cash In: Rp {Number(summary.cash_flow.cash_in || 0).toLocaleString('id-ID')}</div>
        <div className="rounded border p-3">Cash Out: Rp {Number(summary.cash_flow.cash_out || 0).toLocaleString('id-ID')}</div>
        <div className="rounded border p-3">Net Cashflow: Rp {Number(summary.cash_flow.net_cashflow || 0).toLocaleString('id-ID')}</div>
        <div className="rounded border p-3">Operating: Rp {Number(summary.cash_flow.classified?.operating || 0).toLocaleString('id-ID')}</div>
        <div className="rounded border p-3">Investing: Rp {Number(summary.cash_flow.classified?.investing || 0).toLocaleString('id-ID')}</div>
        <div className="rounded border p-3">Financing: Rp {Number(summary.cash_flow.classified?.financing || 0).toLocaleString('id-ID')}</div>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">Trial Balance</h3>
        <div className="space-y-1 text-sm">
          {loading ? (
            <p className="text-muted-foreground">Memuat trial balance...</p>
          ) : summary.trial_balance.length === 0 ? (
            <p className="text-muted-foreground">Belum ada data trial balance.</p>
          ) : (
            summary.trial_balance.map((row) => (
              <div key={row.account_id} className="grid grid-cols-4 rounded border px-3 py-2">
                <span>{row.code}</span>
                <span>{row.name}</span>
                <span className="text-right">D {Number(row.debit || 0).toLocaleString('id-ID')}</span>
                <span className="text-right">K {Number(row.credit || 0).toLocaleString('id-ID')}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">General Ledger</h3>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Total baris: {glTotal}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={glPage <= 1} onClick={() => setGlPage((p) => Math.max(1, p - 1))}>Prev</Button>
            <span>Page {glPage}</span>
            <Button variant="outline" size="sm" disabled={glPage * glPageSize >= glTotal} onClick={() => setGlPage((p) => p + 1)}>Next</Button>
            <Button variant="outline" size="sm" onClick={exportGeneralLedgerCsv}>Export GL CSV</Button>
          </div>
        </div>
        <div className="space-y-1 text-sm">
          {loading ? (
            <p className="text-muted-foreground">Memuat general ledger...</p>
          ) : generalLedger.length === 0 ? (
            <p className="text-muted-foreground">Belum ada data general ledger.</p>
          ) : (
            generalLedger.map((row) => (
              <div key={row.id} className="grid grid-cols-5 rounded border px-3 py-2">
                <span>{row.journal?.entry_date || '-'}</span>
                <span>{row.account?.code || '-'}</span>
                <span>{row.journal?.description || row.description || '-'}</span>
                <span className="text-right">D {Number(row.debit || 0).toLocaleString('id-ID')}</span>
                <span className="text-right">K {Number(row.credit || 0).toLocaleString('id-ID')}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
