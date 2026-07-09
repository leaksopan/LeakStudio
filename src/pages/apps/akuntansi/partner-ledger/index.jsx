import { useEffect, useMemo, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { akuntansiService } from '@/services/akuntansiService.js';
import { akuntansiAdvancedService } from '@/services/akuntansiAdvancedService.js';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { downloadCsv } from '@/utils/csvExport.js';

function groupByPartner(rows, partnerNameKey, amountKey) {
  const map = new Map();
  for (const row of rows) {
    const partner = row[partnerNameKey] || 'Partner Tidak Diketahui';
    const current = map.get(partner) || { partner, total: 0, count: 0 };
    current.total += Number(row[amountKey] || 0);
    current.count += 1;
    map.set(partner, current);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export default function PartnerLedgerPage() {
  const { tenant } = useTenant();
  const [search, setSearch] = useState('');
  const [partnerType, setPartnerType] = useState('all');
  const [ar, setAr] = useState([]);
  const [ap, setAp] = useState([]);

  useEffect(() => {
    let active = true;
    if (!tenant?.id) return () => { active = false; };

    (async () => {
      const [invoices, bills] = await Promise.all([
        akuntansiService.getInvoiceList(tenant.id),
        akuntansiAdvancedService.getVendorBills(tenant.id),
      ]);
      if (!active) return;
      const arRows = invoices.map((x) => ({
        ...x,
        partner_name: x.customer?.name || x.customer_id || 'Customer Tidak Diketahui',
        ledger_amount: Number(x.outstanding_amount || 0),
      }));
      const apRows = bills.map((x) => ({
        ...x,
        partner_name: x.vendor?.name || x.vendor_id || 'Vendor Tidak Diketahui',
        ledger_amount: Number(x.amount || 0),
      }));
      setAr(arRows);
      setAp(apRows);
    })();

    return () => { active = false; };
  }, [tenant?.id]);

  const arGrouped = useMemo(() => groupByPartner(ar, 'partner_name', 'ledger_amount'), [ar]);
  const apGrouped = useMemo(() => groupByPartner(ap, 'partner_name', 'ledger_amount'), [ap]);

  const filteredAr = arGrouped.filter((r) => r.partner.toLowerCase().includes(search.toLowerCase()));
  const filteredAp = apGrouped.filter((r) => r.partner.toLowerCase().includes(search.toLowerCase()));

  const exportCsv = () => {
    const rows = [['Type', 'Partner', 'Total', 'Dokumen']];
    if (partnerType === 'all' || partnerType === 'customer') {
      for (const row of filteredAr) rows.push(['AR', row.partner, row.total, row.count]);
    }
    if (partnerType === 'all' || partnerType === 'vendor') {
      for (const row of filteredAp) rows.push(['AP', row.partner, row.total, row.count]);
    }
    downloadCsv(`partner-ledger-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">Partner Ledger</h2>
      <div className="grid gap-3 md:grid-cols-4">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari partner..." />
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={partnerType} onChange={(e) => setPartnerType(e.target.value)}>
          <option value="all">Semua Partner</option>
          <option value="customer">Customer (AR)</option>
          <option value="vendor">Vendor (AP)</option>
        </select>
        <Button variant="outline" onClick={exportCsv}>Export Ledger CSV</Button>
      </div>

      {(partnerType === 'all' || partnerType === 'customer') && (
        <div className="space-y-2 text-sm">
          <h3 className="font-medium">Customer Ledger (AR)</h3>
          {filteredAr.length === 0 ? <p className="text-muted-foreground">Belum ada ledger customer.</p> : filteredAr.map((row) => (
            <div key={`ar-${row.partner}`} className="grid grid-cols-3 rounded border px-3 py-2">
              <span>{row.partner}</span>
              <span className="text-right">Rp {row.total.toLocaleString('id-ID')}</span>
              <span className="text-right">{row.count} dokumen</span>
            </div>
          ))}
        </div>
      )}

      {(partnerType === 'all' || partnerType === 'vendor') && (
        <div className="space-y-2 text-sm">
          <h3 className="font-medium">Vendor Ledger (AP)</h3>
          {filteredAp.length === 0 ? <p className="text-muted-foreground">Belum ada ledger vendor.</p> : filteredAp.map((row) => (
            <div key={`ap-${row.partner}`} className="grid grid-cols-3 rounded border px-3 py-2">
              <span>{row.partner}</span>
              <span className="text-right">Rp {row.total.toLocaleString('id-ID')}</span>
              <span className="text-right">{row.count} dokumen</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
