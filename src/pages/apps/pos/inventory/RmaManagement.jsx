import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { inventoryModuleService } from '@/services/inventoryModuleService.js';
import { inventoryPageService } from '@/services/inventoryPageService.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { exportCsv } from '@/utils/exportCsv.js';
import { validateRmaCreate } from '@/utils/rmaValidation.js';
import { mapInventoryError } from '@/utils/inventoryErrorMap.js';
import { exportSectionedCsv } from '@/utils/exportSectionedCsv.js';

export default function RmaManagement() {
  const { tenant } = useTenant();
  const { hasInventoryAction } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [approveForm, setApproveForm] = useState({ rmaId: '', locationId: '', notes: '' });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState({ rma: null, lines: [], movements: [] });
  const [form, setForm] = useState({ source_document_type: '', source_document_id: '', partner_name: '', reason: '', product_id: '', qty: '' });
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const summary = {
    submitted: rows.filter((r) => r.status === 'submitted').length,
    approved: rows.filter((r) => r.status === 'approved').length,
    rejected: rows.filter((r) => r.status === 'rejected').length,
    cancelled: rows.filter((r) => r.status === 'cancelled').length,
  };
  const totalProcessed = summary.approved + summary.rejected;
  const approvalRate = totalProcessed > 0 ? ((summary.approved / totalProcessed) * 100).toFixed(1) : '0.0';

  const load = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const [rmaRows, dropdowns] = await Promise.all([
        inventoryModuleService.listRmaRequests(tenant.id),
        inventoryPageService.getProductsAndLocations(tenant.id),
      ]);
      setRows(rmaRows);
      setProducts(dropdowns.products || []);
      setLocations(dropdowns.locations || []);
    } catch (error) {
      setErrorMessage(mapInventoryError(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load().catch(console.error); }, [tenant?.id]);

  const submit = async (e) => {
    e.preventDefault();
    const validation = validateRmaCreate(form);
    if (!validation.valid) {
      toast({ title: 'Validasi gagal', description: Object.values(validation.errors)[0], variant: 'destructive' });
      return;
    }
    try {
      await inventoryModuleService.createRmaRequest({
        source_document_type: validation.payload.source_document_type,
        source_document_id: validation.payload.source_document_id,
        partner_name: validation.payload.partner_name,
        reason: validation.payload.reason,
        lines: [{ product_id: validation.payload.product_id, qty: validation.payload.qty }],
      });
      setForm({ source_document_type: '', source_document_id: '', partner_name: '', reason: '', product_id: '', qty: '' });
      toast({ title: 'Sukses', description: 'RMA request berhasil dibuat.' });
      await load();
    } catch (error) {
      toast({ title: 'Gagal create RMA', description: mapInventoryError(error), variant: 'destructive' });
    }
  };

  const openDetail = async (rmaId) => {
    try {
      const data = await inventoryModuleService.getRmaDetail(rmaId);
      setDetail(data);
      setDetailOpen(true);
    } catch (error) {
      toast({ title: 'Gagal buka detail RMA', description: mapInventoryError(error), variant: 'destructive' });
    }
  };

  const approveRma = async (rmaId) => {
    if (!approveForm.locationId) {
      toast({ title: 'Validasi gagal', description: 'Lokasi approval wajib dipilih.', variant: 'destructive' });
      return;
    }
    try {
      await inventoryModuleService.approveRmaRequest({ rmaId, locationId: approveForm.locationId, notes: approveForm.notes });
      toast({ title: 'Approved', description: 'RMA disetujui dan stok dikembalikan ke inventory.' });
      setApproveForm({ rmaId: '', locationId: '', notes: '' });
      await load();
    } catch (error) {
      toast({ title: 'Gagal approve RMA', description: mapInventoryError(error), variant: 'destructive' });
    }
  };

  const rejectRma = async (rmaId) => {
    const reason = prompt('Masukkan alasan reject RMA:');
    if (!reason) return;
    try {
      await inventoryModuleService.rejectRmaRequest({ rmaId, reason });
      toast({ title: 'Rejected', description: 'RMA ditolak.' });
      await load();
    } catch (error) {
      toast({ title: 'Gagal reject RMA', description: mapInventoryError(error), variant: 'destructive' });
    }
  };

  const cancelRma = async (rmaId) => {
    try {
      await inventoryModuleService.cancelRmaRequest(rmaId);
      toast({ title: 'Cancelled', description: 'RMA dibatalkan.' });
      await load();
    } catch (error) {
      toast({ title: 'Gagal cancel RMA', description: mapInventoryError(error), variant: 'destructive' });
    }
  };

  const filteredRows = rows.filter((row) => {
    if (statusFilter !== 'all' && row.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (row.partner_name || '').toLowerCase().includes(term)
      || (row.reason || '').toLowerCase().includes(term)
      || String(row.source_document_id || '').toLowerCase().includes(term);
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">RMA Management</h2>
        <p className="text-sm text-muted-foreground">Kelola return merchandise authorization dari customer/partner.</p>
        {loading && <p className="text-xs text-muted-foreground">Memuat data RMA...</p>}
        {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}
        <div className="grid gap-2 pt-2 md:grid-cols-4 text-sm">
          <div className="rounded border p-2">Submitted: {summary.submitted}</div>
          <div className="rounded border p-2">Approved: {summary.approved}</div>
          <div className="rounded border p-2">Rejected: {summary.rejected}</div>
          <div className="rounded border p-2">Cancelled: {summary.cancelled}</div>
        </div>
        <p className="text-xs text-muted-foreground">Filtered rows: {filteredRows.length} | Approval rate: {approvalRate}%</p>
      </div>

      {hasInventoryAction('create_rma') && <form onSubmit={submit} className="grid gap-2 md:grid-cols-6">
        <Input placeholder="Source Type" value={form.source_document_type} onChange={(e) => setForm((p) => ({ ...p, source_document_type: e.target.value }))} />
        <Input placeholder="Source ID" value={form.source_document_id} onChange={(e) => setForm((p) => ({ ...p, source_document_id: e.target.value }))} />
        <Input placeholder="Partner" value={form.partner_name} onChange={(e) => setForm((p) => ({ ...p, partner_name: e.target.value }))} />
        <Input placeholder="Reason" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} />
        <Select value={form.product_id} onValueChange={(value) => setForm((p) => ({ ...p, product_id: value }))}>
          <SelectTrigger><SelectValue placeholder="Produk" /></SelectTrigger>
          <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
        <Input placeholder="Qty" type="number" value={form.qty} onChange={(e) => setForm((p) => ({ ...p, qty: e.target.value }))} />
        <Button type="submit" className="md:col-span-6">Create RMA</Button>
      </form>}

      <div className="grid gap-2 md:grid-cols-2">
        <Input placeholder="Cari partner/reason/source id" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue placeholder="Filter Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">all</SelectItem>
            <SelectItem value="draft">draft</SelectItem>
            <SelectItem value="submitted">submitted</SelectItem>
            <SelectItem value="approved">approved</SelectItem>
            <SelectItem value="rejected">rejected</SelectItem>
            <SelectItem value="cancelled">cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasInventoryAction('export_rma') && (
        <Button
          variant="outline"
          onClick={() => {
            const rowsToExport = rows.map((r) => [
              r.created_at,
              r.source_document_type || '',
              r.source_document_id || '',
              r.partner_name || '',
              r.reason || '',
              r.status,
              r.approved_at || '',
              r.rejected_at || '',
              r.rejected_reason || '',
            ]);
            exportCsv('rma-requests.csv', ['Created', 'SourceType', 'SourceId', 'Partner', 'Reason', 'Status', 'ApprovedAt', 'RejectedAt', 'RejectedReason'], rowsToExport);
          }}
        >
          Export RMA CSV
        </Button>
      )}

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Source</TableHead><TableHead>Partner</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-20 text-center text-muted-foreground">Belum ada RMA request.</TableCell></TableRow>
            ) : paginatedRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{new Date(row.created_at).toLocaleString('id-ID')}</TableCell>
                <TableCell>{row.source_document_type || '-'} / {row.source_document_id || '-'}</TableCell>
                <TableCell>{row.partner_name || '-'}</TableCell>
                <TableCell>{row.reason || '-'}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell className="flex gap-2">
                  {hasInventoryAction('view_rma_detail') && <Button size="sm" variant="outline" onClick={() => openDetail(row.id)}>Detail</Button>}
                  {row.status !== 'approved' && hasInventoryAction('approve_rma') && (
                    <div className="flex items-center gap-2">
                      <Select value={approveForm.rmaId === row.id ? approveForm.locationId : ''} onValueChange={(value) => setApproveForm({ ...approveForm, rmaId: row.id, locationId: value })}>
                        <SelectTrigger className="w-44"><SelectValue placeholder="Lokasi Approve" /></SelectTrigger>
                        <SelectContent>{locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button size="sm" onClick={() => approveRma(row.id)}>Approve</Button>
                    </div>
                  )}
                  {row.status !== 'approved' && hasInventoryAction('reject_rma') && <Button size="sm" variant="outline" onClick={() => rejectRma(row.id)}>Reject</Button>}
                  {['draft', 'submitted'].includes(row.status) && hasInventoryAction('cancel_rma') && <Button size="sm" variant="outline" onClick={() => cancelRma(row.id)}>Cancel</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t p-3">
          <span className="text-xs text-muted-foreground">Rows: {filteredRows.length}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <span className="text-xs text-muted-foreground">Page {page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>RMA Detail</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p>Status: {detail.rma?.status || '-'}</p>
            <p>Reason: {detail.rma?.reason || '-'}</p>
            {hasInventoryAction('export_rma') && (
              <Button
                variant="outline"
                onClick={() => {
                  const headerRows = [[detail.rma?.id || '', detail.rma?.status || '', detail.rma?.partner_name || '', detail.rma?.reason || '', detail.rma?.source_document_type || '', detail.rma?.source_document_id || '']];
                  const lineRows = detail.lines.map((line) => [line.m_products?.name || '', line.t_inventory_batches?.batch_number || '', line.qty]);
                  const movementRows = detail.movements.map((m) => [m.created_at, m.movement_type, m.m_products?.name || '', m.m_locations?.name || '', m.qty]);
                  exportSectionedCsv(`rma-${detail.rma?.id || 'detail'}.csv`, [
                    { title: 'RMA Header', headers: ['RMA ID', 'Status', 'Partner', 'Reason', 'Source Type', 'Source ID'], rows: headerRows },
                    { title: 'RMA Lines', headers: ['Produk', 'Batch', 'Qty'], rows: lineRows },
                    { title: 'RMA Movements', headers: ['Tanggal', 'Tipe', 'Produk', 'Lokasi', 'Qty'], rows: movementRows },
                  ]);
                }}
              >
                Export Full RMA CSV
              </Button>
            )}
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Lines</h4>
            <Button
              variant="outline"
              onClick={() => {
                const rowsToExport = detail.lines.map((line) => [
                  line.m_products?.name || '',
                  line.t_inventory_batches?.batch_number || '',
                  line.qty,
                ]);
                exportCsv('rma-lines.csv', ['Produk', 'Batch', 'Qty'], rowsToExport);
              }}
            >
              Export Lines CSV
            </Button>
            <Table>
              <TableHeader><TableRow><TableHead>Produk</TableHead><TableHead>Batch</TableHead><TableHead className="text-right">Qty</TableHead></TableRow></TableHeader>
              <TableBody>
                {detail.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>{line.m_products?.name || '-'}</TableCell>
                    <TableCell>{line.t_inventory_batches?.batch_number || '-'}</TableCell>
                    <TableCell className="text-right">{line.qty}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Movement Timeline</h4>
            <Button
              variant="outline"
              onClick={() => {
                const rowsToExport = detail.movements.map((m) => [
                  m.created_at,
                  m.movement_type,
                  m.m_products?.name || '',
                  m.m_locations?.name || '',
                  m.qty,
                ]);
                exportCsv('rma-movements.csv', ['Tanggal', 'Tipe', 'Produk', 'Lokasi', 'Qty'], rowsToExport);
              }}
            >
              Export Movements CSV
            </Button>
            <Table>
              <TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Tipe</TableHead><TableHead>Produk</TableHead><TableHead>Lokasi</TableHead><TableHead className="text-right">Qty</TableHead></TableRow></TableHeader>
              <TableBody>
                {detail.movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{new Date(m.created_at).toLocaleString('id-ID')}</TableCell>
                    <TableCell>{m.movement_type}</TableCell>
                    <TableCell>{m.m_products?.name || '-'}</TableCell>
                    <TableCell>{m.m_locations?.name || '-'}</TableCell>
                    <TableCell className="text-right">{m.qty}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
