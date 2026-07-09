import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';
import { akuntansiWorkflowService } from '@/services/akuntansiWorkflowService.js';
import { downloadCsv } from '@/utils/csvExport.js';

export default function PaymentVoucherPage() {
  const { tenant } = useTenant();
  const { role } = useAuth();
  const { toast } = useToast();
  const [voucherNumber, setVoucherNumber] = useState('');
  const [partnerType, setPartnerType] = useState('vendor');
  const [amount, setAmount] = useState('');
  const [rows, setRows] = useState([]);
  const [selectedVoucherId, setSelectedVoucherId] = useState('');
  const [trail, setTrail] = useState([]);
  const [rejectReason, setRejectReason] = useState('Dokumen tidak lengkap');

  const canApprove = ['superadmin', 'master', 'manager'].includes(role?.name);

  const load = async () => {
    if (!tenant?.id) return;
    setRows(await akuntansiWorkflowService.getPaymentVouchers(tenant.id));
  };

  useEffect(() => { load(); }, [tenant?.id]);

  const onCreate = async () => {
    const total = Number(amount);
    if (!tenant?.id || !voucherNumber.trim() || !Number.isFinite(total) || total <= 0) return;
    try {
      await akuntansiWorkflowService.createPaymentVoucher(tenant.id, {
        voucher_number: voucherNumber.trim(),
        partner_type: partnerType,
        partner_id: null,
        total_amount: total,
        status: 'draft',
        lines: [{ source_type: partnerType === 'vendor' ? 'bill' : 'invoice', source_id: crypto.randomUUID(), amount: total }],
      });
      setVoucherNumber('');
      setAmount('');
      await load();
      toast({ title: 'Sukses', description: 'Payment voucher dibuat.' });
    } catch (e) {
      toast({ title: 'Gagal membuat voucher', description: e.message, variant: 'destructive' });
    }
  };

  const onApprove = async (id) => {
    if (!tenant?.id) return;
    try {
      await akuntansiWorkflowService.approvePaymentVoucher(tenant.id, id);
      await load();
      toast({ title: 'Sukses', description: 'Payment voucher disetujui.' });
    } catch (e) {
      toast({ title: 'Gagal approve voucher', description: e.message, variant: 'destructive' });
    }
  };

  const onReject = async (id) => {
    if (!tenant?.id) return;
    try {
      await akuntansiWorkflowService.rejectPaymentVoucher(tenant.id, id, rejectReason);
      await load();
      setRejectReason('');
      toast({ title: 'Sukses', description: 'Payment voucher ditolak.' });
    } catch (e) {
      toast({ title: 'Gagal reject voucher', description: e.message, variant: 'destructive' });
    }
  };

  const loadTrail = async (id) => {
    if (!tenant?.id) return;
    setSelectedVoucherId(id);
    setTrail(await akuntansiWorkflowService.getPaymentVoucherApprovalTrail(tenant.id, id));
  };

  const exportTrailCsv = () => {
    if (!selectedVoucherId) return;
    const rowsCsv = [
      ['Action', 'Role', 'Note', 'Timestamp'],
      ...trail.map((t) => [t.action, t.actor_role || '', t.note || '', t.created_at]),
    ];
    downloadCsv(`payment-voucher-trail-${selectedVoucherId}.csv`, rowsCsv);
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">Payment Voucher</h2>
      <div className="grid gap-3 md:grid-cols-4">
        <Input value={voucherNumber} onChange={(e) => setVoucherNumber(e.target.value)} placeholder="Nomor voucher" />
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={partnerType} onChange={(e) => setPartnerType(e.target.value)}>
          <option value="vendor">Vendor (AP)</option>
          <option value="customer">Customer (AR)</option>
        </select>
        <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="Nominal" />
        <Button onClick={onCreate}>Buat Voucher</Button>
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada payment voucher.</p> : rows.map((r) => (
        <div key={r.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
          <span>{r.voucher_number} ({r.partner_type}) - Rp {Number(r.total_amount).toLocaleString('id-ID')} [{r.status}]</span>
          <div className="flex gap-2">
            {canApprove && r.status !== 'approved' && r.status !== 'rejected' && <Button variant="outline" size="sm" onClick={() => onApprove(r.id)}>Approve</Button>}
            {canApprove && r.status !== 'approved' && r.status !== 'rejected' && <Button variant="outline" size="sm" onClick={() => onReject(r.id)}>Reject</Button>}
            <Button variant="outline" size="sm" onClick={() => loadTrail(r.id)}>Trail</Button>
          </div>
        </div>
      ))}

      {selectedVoucherId && (
        <div className="space-y-2 rounded border p-3">
          <h3 className="font-medium">Approval Trail</h3>
          {canApprove && (
            <div className="grid gap-2 md:grid-cols-3">
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}>
                <option>Dokumen tidak lengkap</option>
                <option>Nominal tidak sesuai</option>
                <option>Melebihi budget</option>
                <option>Data partner tidak valid</option>
                <option>Lainnya</option>
              </select>
              <Button variant="outline" size="sm" onClick={() => onReject(selectedVoucherId)}>Reject Dengan Alasan</Button>
              <Button variant="outline" size="sm" onClick={exportTrailCsv}>Export Trail CSV</Button>
            </div>
          )}
          {trail.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada trail approval.</p> : trail.map((t) => (
            <div key={t.id} className="rounded border px-3 py-2 text-sm">{t.action} by {t.actor_role || 'unknown'} at {new Date(t.created_at).toLocaleString('id-ID')} {t.note ? `- ${t.note}` : ''}</div>
          ))}
        </div>
      )}
    </div>
  );
}
