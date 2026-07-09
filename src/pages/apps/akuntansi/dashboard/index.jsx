import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { akuntansiService } from '@/services/akuntansiService.js';
import { akuntansiAdvancedService } from '@/services/akuntansiAdvancedService.js';
import { supabase } from '@/lib/supabase.js';

export default function AkuntansiDashboard() {
  const { tenant } = useTenant();
  const [kpi, setKpi] = useState({ arOutstanding: 0, apOutstanding: 0, overdueAr: 0, overdueAp: 0 });
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    let active = true;
    if (!tenant?.id) return () => { active = false; };

    (async () => {
      const [invoices, bills] = await Promise.all([
        akuntansiService.getInvoiceList(tenant.id),
        akuntansiAdvancedService.getVendorBills(tenant.id),
      ]);
      const { data: pv } = await supabase
        .from('akuntansi_payment_vouchers')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('status', 'draft')
        .is('deleted_at', null);
      const { data: unread } = await supabase
        .from('akuntansi_notifications')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('is_read', false);

      if (!active) return;

      const now = Date.now();
      const arOutstanding = invoices.reduce((a, x) => a + Math.max(0, Number(x.outstanding_amount || 0)), 0);
      const apOutstanding = bills.reduce((a, x) => a + Number(x.amount || 0), 0);
      const overdueAr = invoices
        .filter((x) => new Date(x.due_date || x.created_at).getTime() < now)
        .reduce((a, x) => a + Math.max(0, Number(x.outstanding_amount || 0)), 0);
      const overdueAp = bills
        .filter((x) => new Date(x.due_date || x.created_at).getTime() < now)
        .reduce((a, x) => a + Number(x.amount || 0), 0);

      setKpi({ arOutstanding, apOutstanding, overdueAr, overdueAp });
      setPendingApprovals((pv || []).length);
      setUnreadNotifications((unread || []).length);
    })();

    return () => { active = false; };
  }, [tenant?.id]);

  useEffect(() => {
    if (!tenant?.id) return undefined;

    const interval = setInterval(async () => {
      const { data: unread } = await supabase
        .from('akuntansi_notifications')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('is_read', false);
      setUnreadNotifications((unread || []).length);
    }, 30000);

    return () => clearInterval(interval);
  }, [tenant?.id]);

  return (
    <div className="space-y-4">
      <h1 className="text-4xl font-bold text-primary">LeakStudio Akuntansi</h1>
      <p className="text-muted-foreground">Ringkasan kesehatan arus kas dan outstanding.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded border bg-card p-4">Outstanding AR: Rp {kpi.arOutstanding.toLocaleString('id-ID')}</div>
        <div className="rounded border bg-card p-4">Outstanding AP: Rp {kpi.apOutstanding.toLocaleString('id-ID')}</div>
        <div className="rounded border bg-card p-4">AR Overdue: Rp {kpi.overdueAr.toLocaleString('id-ID')}</div>
        <div className="rounded border bg-card p-4">AP Overdue: Rp {kpi.overdueAp.toLocaleString('id-ID')}</div>
        <div className="rounded border bg-card p-4">Pending Approval Voucher: {pendingApprovals}</div>
        <div className="rounded border bg-card p-4">Notifikasi Belum Dibaca: {unreadNotifications}</div>
      </div>
    </div>
  );
}
