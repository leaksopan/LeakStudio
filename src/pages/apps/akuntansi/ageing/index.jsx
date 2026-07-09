import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { akuntansiService } from '@/services/akuntansiService.js';
import { akuntansiAdvancedService } from '@/services/akuntansiAdvancedService.js';
import { Button } from '@/components/ui/button.jsx';
import { downloadCsv } from '@/utils/csvExport.js';

function bucketByAge(items, dateField, amountField) {
  const now = Date.now();
  const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  for (const item of items) {
    const due = new Date(item[dateField] || item.created_at).getTime();
    const diff = Math.max(0, Math.floor((now - due) / 86400000));
    const amount = Number(item[amountField] || 0);
    if (diff <= 30) buckets['0-30'] += amount;
    else if (diff <= 60) buckets['31-60'] += amount;
    else if (diff <= 90) buckets['61-90'] += amount;
    else buckets['90+'] += amount;
  }
  return buckets;
}

function byPartnerAgeing(items, partnerField, partnerNameField, dateField, amountField) {
  const now = Date.now();
  const map = new Map();
  for (const item of items) {
    const key = item[partnerField] || 'unassigned';
    const name = item[partnerNameField] || key;
    const due = new Date(item[dateField] || item.created_at).getTime();
    const diff = Math.max(0, Math.floor((now - due) / 86400000));
    const amount = Number(item[amountField] || 0);
    const current = map.get(key) || { partner_id: key, partner_name: name, total: 0, overdue: 0 };
    current.total += amount;
    if (diff > 30) current.overdue += amount;
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export default function AgeingPage() {
  const { tenant } = useTenant();
  const [ar, setAr] = useState({ '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 });
  const [ap, setAp] = useState({ '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 });
  const [arByPartner, setArByPartner] = useState([]);
  const [apByPartner, setApByPartner] = useState([]);

  useEffect(() => {
    let active = true;
    if (!tenant?.id) return () => { active = false; };
    (async () => {
      const [invoices, bills] = await Promise.all([
        akuntansiService.getInvoiceList(tenant.id),
        akuntansiAdvancedService.getVendorBills(tenant.id),
      ]);
      const invoicesWithPartner = invoices.map((inv) => ({
        ...inv,
        customer_name: inv.customer?.name || inv.customer_id || 'Customer Tidak Diketahui',
      }));
      const billsWithPartner = bills.map((bill) => ({
        ...bill,
        vendor_name: bill.vendor?.name || bill.vendor_id || 'Vendor Tidak Diketahui',
      }));
      if (!active) return;
      setAr(bucketByAge(invoicesWithPartner, 'due_date', 'amount'));
      setAp(bucketByAge(billsWithPartner, 'due_date', 'amount'));
      setArByPartner(byPartnerAgeing(invoicesWithPartner, 'customer_id', 'customer_name', 'due_date', 'amount'));
      setApByPartner(byPartnerAgeing(billsWithPartner, 'vendor_id', 'vendor_name', 'due_date', 'amount'));
    })();
    return () => { active = false; };
  }, [tenant?.id]);

  const exportPartnerAgeing = () => {
    const rowsCsv = [
      ['Type', 'Partner', 'Total', 'Overdue'],
      ...arByPartner.map((r) => ['AR', r.partner_name, r.total, r.overdue]),
      ...apByPartner.map((r) => ['AP', r.partner_name, r.total, r.overdue]),
    ];
    downloadCsv(`ageing-partner-${new Date().toISOString().slice(0, 10)}.csv`, rowsCsv);
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">Ageing Receivable & Payable</h2>
      <Button variant="outline" size="sm" onClick={exportPartnerAgeing}>Export Partner Ageing CSV</Button>
      <div className="grid gap-4 md:grid-cols-2 text-sm">
        <div className="rounded border p-3">
          <h3 className="mb-2 font-medium">AR Ageing</h3>
          {Object.entries(ar).map(([k, v]) => <p key={k}>{k} hari: Rp {Number(v).toLocaleString('id-ID')}</p>)}
        </div>
        <div className="rounded border p-3">
          <h3 className="mb-2 font-medium">AP Ageing</h3>
          {Object.entries(ap).map(([k, v]) => <p key={k}>{k} hari: Rp {Number(v).toLocaleString('id-ID')}</p>)}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 text-sm">
        <div className="rounded border p-3">
          <h3 className="mb-2 font-medium">AR per Partner</h3>
          {arByPartner.length === 0 ? <p className="text-muted-foreground">Belum ada data partner AR.</p> : arByPartner.map((row) => (
            <p key={row.partner_id}>{row.partner_name}: Total Rp {row.total.toLocaleString('id-ID')} | Overdue Rp {row.overdue.toLocaleString('id-ID')}</p>
          ))}
        </div>
        <div className="rounded border p-3">
          <h3 className="mb-2 font-medium">AP per Partner</h3>
          {apByPartner.length === 0 ? <p className="text-muted-foreground">Belum ada data partner AP.</p> : apByPartner.map((row) => (
            <p key={row.partner_id}>{row.partner_name}: Total Rp {row.total.toLocaleString('id-ID')} | Overdue Rp {row.overdue.toLocaleString('id-ID')}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
