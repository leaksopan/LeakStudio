import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { akuntansiAdvancedService } from '@/services/akuntansiAdvancedService.js';
import { akuntansiCoreService } from '@/services/akuntansiCoreService.js';
import { useToast } from '@/components/ui/use-toast.jsx';

export default function VendorBillsPage() {
  const [vendorName, setVendorName] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [rows, setRows] = useState([]);
  const [periodBlocked, setPeriodBlocked] = useState(false);
  const { tenant } = useTenant();
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      if (!tenant?.id) return;
      setRows(await akuntansiAdvancedService.getVendorBills(tenant.id));
      const period = await akuntansiCoreService.getPeriodStatusForToday(tenant.id);
      setPeriodBlocked(!period.hasPeriod || period.isClosed);
    };
    load();
  }, [tenant?.id]);

  const onAdd = async () => {
    const numeric = Number(amount);
    if (!vendorName.trim() || !billNumber.trim() || !Number.isFinite(numeric) || numeric <= 0) return;
    if (!tenant?.id) return;
    try {
      await akuntansiAdvancedService.createVendorBill(tenant.id, {
        vendor_id: null,
        bill_number: billNumber.trim(),
        amount: numeric,
        due_date: new Date().toISOString().slice(0, 10),
        status: 'draft',
      });
      setRows(await akuntansiAdvancedService.getVendorBills(tenant.id));
      setVendorName('');
      setBillNumber('');
      setAmount('');
      toast({ title: 'Sukses', description: 'Tagihan vendor berhasil ditambahkan.' });
    } catch (error) {
      toast({ title: 'Gagal menambah tagihan', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">Tagihan Vendor (AP)</h2>
      <div className="grid gap-3 md:grid-cols-4">
        <Input placeholder="Vendor" value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
        <Input placeholder="Nomor Bill" value={billNumber} onChange={(e) => setBillNumber(e.target.value)} />
        <Input placeholder="Nominal" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Button onClick={onAdd} disabled={periodBlocked}>Tambah Bill</Button>
      </div>
      {periodBlocked && <p className="text-xs text-red-600">Periode fiskal aktif tidak tersedia atau sedang ditutup.</p>}
      <div className="space-y-1 text-sm">
        {rows.length === 0 ? <p className="text-muted-foreground">Belum ada data bill vendor.</p> : rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between rounded-md border px-3 py-2">
            <span>{row.bill_number}</span>
            <span>Rp {row.amount.toLocaleString('id-ID')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
