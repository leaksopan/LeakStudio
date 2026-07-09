import { useEffect, useMemo, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { akuntansiService } from '@/services/akuntansiService.js';
import { akuntansiAdvancedService } from '@/services/akuntansiAdvancedService.js';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { downloadCsv } from '@/utils/csvExport.js';
import { Badge } from '@/components/ui/badge.jsx';
import { Link } from 'react-router-dom';

function getBucket(dueDate) {
  const due = new Date(dueDate).getTime();
  const now = Date.now();
  const diff = Math.max(0, Math.floor((now - due) / 86400000));
  if (diff <= 30) return '0-30';
  if (diff <= 60) return '31-60';
  if (diff <= 90) return '61-90';
  return '90+';
}

export default function OutstandingPage() {
  const { tenant } = useTenant();
  const [search, setSearch] = useState('');
  const [bucket, setBucket] = useState('all');
  const [arRows, setArRows] = useState([]);
  const [apRows, setApRows] = useState([]);

  useEffect(() => {
    let active = true;
    if (!tenant?.id) return () => { active = false; };
    (async () => {
      const [invoices, bills] = await Promise.all([
        akuntansiService.getInvoiceList(tenant.id),
        akuntansiAdvancedService.getVendorBills(tenant.id),
      ]);
      if (!active) return;

      const apMapped = bills.map((b) => ({
        id: b.id,
        number: b.bill_number,
        partner: b.vendor?.name || b.vendor_id || 'Vendor Tidak Diketahui',
        due_date: b.due_date,
        outstanding_amount: Number(b.amount || 0),
      }));
      setArRows(invoices);
      setApRows(apMapped);
    })();
    return () => { active = false; };
  }, [tenant?.id]);

  const filteredAr = useMemo(() => arRows.filter((r) => {
    const text = `${r.invoice_number} ${r.customer?.name || ''}`.toLowerCase();
    const okSearch = text.includes(search.toLowerCase());
    const b = getBucket(r.due_date || r.created_at);
    const okBucket = bucket === 'all' || b === bucket;
    return okSearch && okBucket && Number(r.outstanding_amount || 0) > 0;
  }), [arRows, search, bucket]);

  const filteredAp = useMemo(() => apRows.filter((r) => {
    const text = `${r.number} ${r.partner}`.toLowerCase();
    const okSearch = text.includes(search.toLowerCase());
    const b = getBucket(r.due_date || new Date().toISOString());
    const okBucket = bucket === 'all' || b === bucket;
    return okSearch && okBucket && Number(r.outstanding_amount || 0) > 0;
  }), [apRows, search, bucket]);

  const exportCsv = () => {
    const rows = [
      ['Type', 'Number', 'Partner', 'Due Date', 'Bucket', 'Outstanding'],
      ...filteredAr.map((r) => ['AR', r.invoice_number, r.customer?.name || '', r.due_date, getBucket(r.due_date || r.created_at), r.outstanding_amount]),
      ...filteredAp.map((r) => ['AP', r.number, r.partner, r.due_date, getBucket(r.due_date), r.outstanding_amount]),
    ];
    downloadCsv(`outstanding-ar-ap-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">Outstanding AR/AP</h2>
      <div>
        <Button asChild variant="outline" size="sm">
          <Link to="../ageing">Buka Laporan Ageing</Link>
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari invoice/vendor bill/partner..." />
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={bucket} onChange={(e) => setBucket(e.target.value)}>
          <option value="all">Semua Bucket</option>
          <option value="0-30">0-30</option>
          <option value="31-60">31-60</option>
          <option value="61-90">61-90</option>
          <option value="90+">90+</option>
        </select>
        <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
      </div>

      <div className="space-y-2 text-sm">
        <h3 className="font-medium">Receivable</h3>
        {filteredAr.length === 0 ? <p className="text-muted-foreground">Tidak ada outstanding AR.</p> : filteredAr.map((r) => (
          <div key={r.id} className="grid grid-cols-5 rounded border px-3 py-2">
            <span className="flex items-center gap-2">{r.invoice_number} <Badge variant={r.payment_status === 'paid' ? 'default' : r.payment_status === 'partial' ? 'secondary' : 'outline'}>{r.payment_status || 'unpaid'}</Badge></span>
            <span>{r.customer?.name || '-'}</span>
            <span>{r.due_date || '-'}</span>
            <span>{getBucket(r.due_date || r.created_at)}</span>
            <span className="text-right">Rp {Number(r.outstanding_amount || 0).toLocaleString('id-ID')}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2 text-sm">
        <h3 className="font-medium">Payable</h3>
        {filteredAp.length === 0 ? <p className="text-muted-foreground">Tidak ada outstanding AP.</p> : filteredAp.map((r) => (
          <div key={r.id} className="grid grid-cols-5 rounded border px-3 py-2">
            <span className="flex items-center gap-2">{r.number} <Badge variant="outline">payable</Badge></span>
            <span>{r.partner}</span>
            <span>{r.due_date || '-'}</span>
            <span>{getBucket(r.due_date || new Date().toISOString())}</span>
            <span className="text-right">Rp {Number(r.outstanding_amount || 0).toLocaleString('id-ID')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
