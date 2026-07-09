import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { akuntansiCoreService } from '@/services/akuntansiCoreService.js';
import { akuntansiExtendedService } from '@/services/akuntansiExtendedService.js';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';

export default function AccountingHealthCheckPage() {
  const { tenant } = useTenant();
  const [state, setState] = useState({ loading: true, error: '', data: null });

  useEffect(() => {
    let active = true;
    if (!tenant?.id) return () => { active = false; };

    (async () => {
      try {
        const [period, coa, cashflowMap] = await Promise.all([
          akuntansiCoreService.getPeriodStatusForToday(tenant.id),
          akuntansiCoreService.getCoa(tenant.id),
          akuntansiExtendedService.getCashflowMappings(tenant.id),
        ]);
        if (!active) return;
        setState({
          loading: false,
          error: '',
          data: {
            has_active_period: period.hasPeriod,
            is_period_closed: period.isClosed,
            coa_count: coa.length,
            cashflow_map_count: cashflowMap.length,
          },
        });
      } catch (error) {
        if (!active) return;
        setState({ loading: false, error: error.message, data: null });
      }
    })();

    return () => { active = false; };
  }, [tenant?.id]);

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">Akuntansi Health Check</h2>
      <Button asChild variant="outline" size="sm">
        <Link to="../setup-wizard">Buka Setup Wizard</Link>
      </Button>
      {state.loading && <p className="text-sm text-muted-foreground">Memeriksa konfigurasi akuntansi...</p>}
      {state.error && <p className="text-sm text-red-600">Gagal memuat health check: {state.error}</p>}
      {state.data && (
        <div className="grid gap-3 md:grid-cols-2 text-sm">
          <div className="rounded border px-3 py-2">Periode aktif hari ini: {state.data.has_active_period ? 'Ya' : 'Tidak'}</div>
          <div className="rounded border px-3 py-2">Periode tertutup: {state.data.is_period_closed ? 'Ya' : 'Tidak'}</div>
          <div className="rounded border px-3 py-2">Jumlah COA: {state.data.coa_count}</div>
          <div className="rounded border px-3 py-2">Jumlah Mapping Cashflow: {state.data.cashflow_map_count}</div>
        </div>
      )}
    </div>
  );
}
