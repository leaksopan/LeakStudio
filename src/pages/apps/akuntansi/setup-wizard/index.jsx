import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { akuntansiCoreService } from '@/services/akuntansiCoreService.js';
import { akuntansiExtendedService } from '@/services/akuntansiExtendedService.js';
import { akuntansiSetupService } from '@/services/akuntansiSetupService.js';
import { Button } from '@/components/ui/button.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';

const STEPS = [
  {
    title: '1. Setup COA',
    description: 'Buat chart of accounts inti (kas, bank, piutang, hutang, pendapatan, beban).',
    to: '../coa',
  },
  {
    title: '2. Setup Fiscal Period',
    description: 'Buat periode fiskal aktif sebelum posting transaksi.',
    to: '../fiscal',
  },
  {
    title: '3. Setup Cashflow Mapping',
    description: 'Mapping account type ke operating/investing/financing.',
    to: '../cashflow-map',
  },
  {
    title: '4. Uji Transaksi AR/AP',
    description: 'Buat invoice, receipt, vendor bill, lalu cek outstanding.',
    to: '../outstanding',
    key: 'test_ar_ap',
    manual: true,
  },
  {
    title: '5. Verifikasi Laporan',
    description: 'Cek Trial Balance, General Ledger, dan Cashflow di report.',
    to: '../reports',
    key: 'verify_reports',
    manual: true,
  },
  {
    title: '6. Jalankan Health Check',
    description: 'Pastikan konfigurasi inti akuntansi sudah siap go-live.',
    to: '../health-check',
    key: 'health_check',
    manual: true,
  },
];

export default function AkuntansiSetupWizardPage() {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [status, setStatus] = useState({
    coa: false,
    period: false,
    cashflowMap: false,
    checked: false,
  });
  const [manualProgress, setManualProgress] = useState({});

  useEffect(() => {
    let active = true;
    if (!tenant?.id) return () => { active = false; };

    (async () => {
      const [coa, period, cashflowMap, progressRows] = await Promise.all([
        akuntansiCoreService.getCoa(tenant.id),
        akuntansiCoreService.getPeriodStatusForToday(tenant.id),
        akuntansiExtendedService.getCashflowMappings(tenant.id),
        akuntansiSetupService.getProgress(tenant.id),
      ]);
      if (!active) return;
      setStatus({
        coa: (coa || []).length > 0,
        period: !!period?.hasPeriod && !period?.isClosed,
        cashflowMap: (cashflowMap || []).length > 0,
        checked: true,
      });
      const map = {};
      for (const row of progressRows || []) {
        map[row.step_key] = !!row.completed;
      }
      setManualProgress(map);
    })();

    return () => { active = false; };
  }, [tenant?.id]);

  const completion = useMemo(() => {
    const autoDone = [status.coa, status.period, status.cashflowMap].filter(Boolean).length;
    const manualKeys = ['test_ar_ap', 'verify_reports', 'health_check'];
    const manualDone = manualKeys.filter((key) => manualProgress[key]).length;
    const total = 6;
    return Math.round(((autoDone + manualDone) / total) * 100);
  }, [status, manualProgress]);

  const readinessLabel = useMemo(() => {
    if (completion >= 100) return 'Siap Go-Live';
    if (completion >= 75) return 'Hampir Siap';
    if (completion >= 40) return 'Perlu Setup Lanjutan';
    return 'Belum Siap';
  }, [completion]);

  const stepReady = useMemo(() => ({
    '1. Setup COA': status.coa,
    '2. Setup Fiscal Period': status.period,
    '3. Setup Cashflow Mapping': status.cashflowMap,
  }), [status]);

  const toggleManualStep = async (stepKey, currentValue) => {
    if (!tenant?.id) return;
    try {
      await akuntansiSetupService.setStepCompletion(tenant.id, stepKey, !currentValue);
      setManualProgress((prev) => ({ ...prev, [stepKey]: !currentValue }));
      toast({ title: 'Sukses', description: 'Status langkah setup diperbarui.' });
    } catch (error) {
      toast({ title: 'Gagal update langkah', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">Setup Wizard Akuntansi</h2>
      <p className="text-sm text-muted-foreground">Ikuti urutan setup agar modul akuntansi siap dipakai operasional.</p>
      <div className="rounded border px-3 py-2 text-sm">
        Progress setup awal: {completion}%
        {!status.checked && ' (memeriksa data...)'}
      </div>
      <div className="rounded border px-3 py-2 text-sm">
        Status kesiapan: <span className="font-medium">{readinessLabel}</span>
      </div>
      <div className="space-y-3">
        {STEPS.map((step) => (
          <div key={step.title} className="rounded border p-3">
            <p className="font-medium">{step.title} {stepReady[step.title] ? '✅' : step.manual && manualProgress[step.key] ? '✅' : ''}</p>
            <p className="text-sm text-muted-foreground">{step.description}</p>
            <Link to={step.to} className="mt-2 inline-block text-sm text-primary underline">
              Buka langkah
            </Link>
            {step.manual && (
              <div className="mt-2">
                <Button variant="outline" size="sm" onClick={() => toggleManualStep(step.key, !!manualProgress[step.key])}>
                  {manualProgress[step.key] ? 'Tandai Belum Selesai' : 'Tandai Selesai'}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
