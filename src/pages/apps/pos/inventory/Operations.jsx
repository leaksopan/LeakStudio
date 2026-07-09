import { useEffect, useMemo, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { inventoryModuleService } from '@/services/inventoryModuleService.js';
import { inventoryPageService } from '@/services/inventoryPageService.js';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';
import OperationDetail from './OperationDetail.jsx';
import { exportCsv } from '@/utils/exportCsv.js';
import { mapInventoryError } from '@/utils/inventoryErrorMap.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

export default function Operations() {
  const { tenant } = useTenant();
  const { hasInventoryAction } = useAuth();
  const { toast } = useToast();
  const EMPTY_LINE_FORM = {
    product_id: '',
    from_location_id: '',
    to_location_id: '',
    qty: '',
    lot_number: '',
    serial_number: '',
    expiry_date: '',
  };
  const [operations, setOperations] = useState([]);
  const [types, setTypes] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({
    operation_type_id: '',
    partner_name: '',
    scheduled_at: '',
  });
  const [lineForm, setLineForm] = useState(EMPTY_LINE_FORM);
  const [lines, setLines] = useState([]);
  const [selectedOperationId, setSelectedOperationId] = useState('');
  const [signatureForm, setSignatureForm] = useState({ operation_id: '', signature_name: '', signature_url: '' });
  const [scanInput, setScanInput] = useState('');
  const [cameraScanStatus, setCameraScanStatus] = useState('idle');
  const [searchSource, setSearchSource] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const load = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const [ops, operationTypes, dropdowns] = await Promise.all([
        inventoryModuleService.listOperations(tenant.id),
        inventoryModuleService.listOperationTypes(tenant.id),
        inventoryPageService.getProductsAndLocations(tenant.id),
      ]);
      setOperations(ops);
      setTypes(operationTypes);
      setProducts(dropdowns.products || []);
      setLocations(dropdowns.locations || []);
    } catch (error) {
      setErrorMessage(error.message || 'Gagal memuat operations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load().catch(console.error); }, [tenant?.id]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchSource), 250);
    return () => clearTimeout(t);
  }, [searchSource]);

  const selectedType = useMemo(() => types.find((type) => type.id === form.operation_type_id), [types, form.operation_type_id]);

  const filteredOperations = operations.filter((op) => {
    if (statusFilter !== 'all' && op.status !== statusFilter) return false;
    if (typeFilter !== 'all' && op.m_inventory_operation_types?.code !== typeFilter) return false;
    if (!debouncedSearch.trim()) return true;
    const term = debouncedSearch.toLowerCase();
    return (op.source_document_type || '').toLowerCase().includes(term)
      || (op.source_document_id || '').toLowerCase().includes(term)
      || (op.partner_name || '').toLowerCase().includes(term);
  });
  const totalPages = Math.max(1, Math.ceil(filteredOperations.length / pageSize));
  const paginatedOperations = filteredOperations.slice((page - 1) * pageSize, page * pageSize);

  const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.operation_type_id || lines.length === 0) {
      toast({ title: 'Validasi gagal', description: 'Lengkapi data operation.', variant: 'destructive' });
      return;
    }

    const selectedCode = selectedType?.code;
    const needsFrom = ['DELIVERY', 'USAGE', 'SCRAP', 'INTERNAL_TRANSFER'].includes(selectedCode);
    const needsTo = ['RECEIVING', 'INTERNAL_TRANSFER'].includes(selectedCode);
    const lineValidationFailed = lines.some((line) => (needsFrom && !line.from_location_id) || (needsTo && !line.to_location_id));
    if (lineValidationFailed) {
      toast({ title: 'Validasi gagal', description: 'Lokasi asal/tujuan belum lengkap.', variant: 'destructive' });
      return;
    }

    try {
      await inventoryModuleService.createOperation({
        operation_type_id: form.operation_type_id,
        partner_name: form.partner_name,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        lines,
      });
      setForm({ operation_type_id: '', partner_name: '', scheduled_at: '' });
      setLineForm(EMPTY_LINE_FORM);
      setLines([]);
      toast({ title: 'Sukses', description: 'Operation berhasil dibuat.' });
      await load();
    } catch (error) {
      toast({ title: 'Gagal membuat operation', description: mapInventoryError(error), variant: 'destructive' });
    }
  };

  const addLine = () => {
    const qty = Number(lineForm.qty);
    if (!lineForm.product_id || !Number.isFinite(qty) || qty <= 0) {
      toast({ title: 'Validasi gagal', description: 'Produk dan qty line wajib valid.', variant: 'destructive' });
      return;
    }

    const selectedCode = selectedType?.code;
    const needsFrom = ['DELIVERY', 'USAGE', 'SCRAP', 'INTERNAL_TRANSFER'].includes(selectedCode);
    const needsTo = ['RECEIVING', 'INTERNAL_TRANSFER'].includes(selectedCode);
    if ((needsFrom && !lineForm.from_location_id) || (needsTo && !lineForm.to_location_id)) {
      toast({ title: 'Validasi line gagal', description: 'Lokasi asal/tujuan wajib sesuai tipe operation.', variant: 'destructive' });
      return;
    }

    setLines((prev) => [...prev, {
      product_id: lineForm.product_id,
      from_location_id: lineForm.from_location_id || null,
      to_location_id: lineForm.to_location_id || null,
      qty,
      lot_number: lineForm.lot_number || null,
      serial_number: lineForm.serial_number || null,
      expiry_date: lineForm.expiry_date || null,
    }]);
    setLineForm(EMPTY_LINE_FORM);
    toast({ title: 'Line ditambahkan', description: 'Line berhasil masuk ke draft operation.' });
  };

  const removeLine = (index) => {
    setLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const approve = async (id) => {
    try {
      await inventoryModuleService.approveOperation(id);
      toast({ title: 'Sukses', description: 'Operation berhasil di-approve.' });
      await load();
    } catch (error) {
      toast({ title: 'Gagal approve', description: mapInventoryError(error), variant: 'destructive' });
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await inventoryModuleService.updateOperationStatus(id, status);
      toast({ title: 'Sukses', description: `Status operation diubah ke ${status}.` });
      await load();
    } catch (error) {
      toast({ title: 'Gagal ubah status', description: mapInventoryError(error), variant: 'destructive' });
    }
  };

  const applyScanToLine = () => {
    if (!scanInput.trim()) return;
    const [productId = '', lotNumber = '', serialNumber = '', expiryDate = '', qtyRaw = '1'] = scanInput.split('|');
    const qty = Number(String(qtyRaw).replace(',', '.'));
    const normalizedExpiry = expiryDate ? new Date(expiryDate).toISOString().slice(0, 10) : '';
    if (!productId || !isUuid(productId) || !Number.isFinite(qty) || qty <= 0 || (expiryDate && Number.isNaN(new Date(expiryDate).getTime()))) {
      toast({ title: 'Format scan tidak valid', description: 'Format: product_id|lot|serial|yyyy-mm-dd|qty', variant: 'destructive' });
      return;
    }
    setLineForm((prev) => ({
      ...prev,
      product_id: productId,
      lot_number: lotNumber,
      serial_number: serialNumber,
      expiry_date: normalizedExpiry,
      qty: String(qty),
    }));
  };

  const submitSignature = async (e) => {
    e.preventDefault();
    if (!signatureForm.operation_id || !signatureForm.signature_url) return;
    try {
      await inventoryModuleService.updateOperationSignature({
        operationId: signatureForm.operation_id,
        signatureUrl: signatureForm.signature_url,
        signatureName: signatureForm.signature_name,
      });
      setSignatureForm({ operation_id: '', signature_name: '', signature_url: '' });
      toast({ title: 'Sukses', description: 'Signature berhasil disimpan.' });
      await load();
    } catch (error) {
      toast({ title: 'Gagal simpan signature', description: mapInventoryError(error), variant: 'destructive' });
    }
  };

  const detectFromCamera = async () => {
    if (!('BarcodeDetector' in window)) {
      toast({ title: 'BarcodeDetector tidak didukung', description: 'Gunakan scanner input manual.', variant: 'destructive' });
      return;
    }

    try {
      setCameraScanStatus('opening');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13'] });
      setCameraScanStatus('scanning');
      let found = null;
      const maxAttempt = 30;
      for (let i = 0; i < maxAttempt; i += 1) {
        const barcodes = await detector.detect(video);
        if (barcodes.length > 0) {
          found = barcodes[0].rawValue;
          break;
        }
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 120));
      }

      stream.getTracks().forEach((track) => track.stop());
      if (found) {
        setScanInput(found);
        setCameraScanStatus('detected');
        toast({ title: 'Scan berhasil', description: 'Data scanner masuk ke input parser.' });
      } else {
        setCameraScanStatus('not_found');
        toast({ title: 'Barcode tidak terdeteksi', description: 'Coba lagi atau gunakan input manual.', variant: 'destructive' });
      }
    } catch (error) {
      setCameraScanStatus('error');
      toast({ title: 'Camera error', description: mapInventoryError(error), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Inventory Operations</h2>
      <p className="text-sm text-muted-foreground">Dokumen operasi receiving/delivery/internal flow dengan approval.</p>
      <p className="text-xs text-muted-foreground">Total rows: {operations.length} | Filtered rows: {filteredOperations.length}</p>
      {loading && <p className="text-xs text-muted-foreground">Memuat operations...</p>}
      {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}
      <div className="rounded border p-2">
        <div className="grid gap-2 md:grid-cols-3">
          <Input placeholder="Cari source doc type/id atau partner" value={searchSource} onChange={(e) => setSearchSource(e.target.value)} />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">all</SelectItem>
              <SelectItem value="draft">draft</SelectItem>
              <SelectItem value="submitted">submitted</SelectItem>
              <SelectItem value="approved">approved</SelectItem>
              <SelectItem value="completed">completed</SelectItem>
              <SelectItem value="cancelled">cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">all</SelectItem>
              {types.map((type) => <SelectItem key={type.id} value={type.code}>{type.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <form onSubmit={submit} className="grid gap-2 md:grid-cols-3">
        <Select value={form.operation_type_id} onValueChange={(value) => setForm((prev) => ({ ...prev, operation_type_id: value }))}>
          <SelectTrigger><SelectValue placeholder="Operation Type" /></SelectTrigger>
          <SelectContent>{types.map((type) => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}</SelectContent>
        </Select>
        <Input placeholder="Partner" value={form.partner_name} onChange={(e) => setForm((prev) => ({ ...prev, partner_name: e.target.value }))} />
        <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm((prev) => ({ ...prev, scheduled_at: e.target.value }))} />
      </form>

      <div className="rounded-md border bg-card p-3 space-y-3">
        <h3 className="text-sm font-semibold">Operation Lines</h3>
        <div className="rounded border p-2">
          <p className="mb-2 text-xs text-muted-foreground">Scanner Input Mode (barcode/QR parser)</p>
          <div className="grid gap-2 md:grid-cols-3">
            <Input placeholder="product_id|lot|serial|yyyy-mm-dd|qty" value={scanInput} onChange={(e) => setScanInput(e.target.value)} />
            <Button type="button" variant="outline" onClick={applyScanToLine}>Apply Scan</Button>
            <Button type="button" variant="outline" onClick={detectFromCamera}>Scan via Camera</Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Status camera: {cameraScanStatus}</p>
        </div>
        <div className="grid gap-2 md:grid-cols-8">
          <Select value={lineForm.product_id} onValueChange={(value) => setLineForm((prev) => ({ ...prev, product_id: value }))}>
            <SelectTrigger><SelectValue placeholder="Produk" /></SelectTrigger>
            <SelectContent>{products.map((product) => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={lineForm.from_location_id} onValueChange={(value) => setLineForm((prev) => ({ ...prev, from_location_id: value }))}>
            <SelectTrigger><SelectValue placeholder="Dari Lokasi" /></SelectTrigger>
            <SelectContent>{locations.map((location) => <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={lineForm.to_location_id} onValueChange={(value) => setLineForm((prev) => ({ ...prev, to_location_id: value }))}>
            <SelectTrigger><SelectValue placeholder="Ke Lokasi" /></SelectTrigger>
            <SelectContent>{locations.map((location) => <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="number" placeholder="Qty" value={lineForm.qty} onChange={(e) => setLineForm((prev) => ({ ...prev, qty: e.target.value }))} />
          <Input placeholder="Lot Number" value={lineForm.lot_number} onChange={(e) => setLineForm((prev) => ({ ...prev, lot_number: e.target.value }))} />
          <Input placeholder="Serial Number" value={lineForm.serial_number} onChange={(e) => setLineForm((prev) => ({ ...prev, serial_number: e.target.value }))} />
          <Input type="date" value={lineForm.expiry_date} onChange={(e) => setLineForm((prev) => ({ ...prev, expiry_date: e.target.value }))} />
          <Button type="button" onClick={addLine}>Add Line</Button>
        </div>

        <Table>
          <TableHeader><TableRow><TableHead>Produk</TableHead><TableHead>Dari</TableHead><TableHead>Ke</TableHead><TableHead>Lot</TableHead><TableHead>Serial</TableHead><TableHead>Expiry</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
          <TableBody>
            {lines.map((line, idx) => (
              <TableRow key={`${line.product_id}-${idx}`}>
                <TableCell>{products.find((product) => product.id === line.product_id)?.name || '-'}</TableCell>
                <TableCell>{locations.find((location) => location.id === line.from_location_id)?.name || '-'}</TableCell>
                <TableCell>{locations.find((location) => location.id === line.to_location_id)?.name || '-'}</TableCell>
                <TableCell>{line.lot_number || '-'}</TableCell>
                <TableCell>{line.serial_number || '-'}</TableCell>
                <TableCell>{line.expiry_date || '-'}</TableCell>
                <TableCell className="text-right">{line.qty}</TableCell>
                <TableCell><Button type="button" size="sm" variant="outline" onClick={() => removeLine(idx)}>Hapus</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Button type="button" className="w-full" onClick={submit}>Create Operation ({selectedType?.code || '-'})</Button>
      </div>

      <div className="rounded-md border bg-card">
        <div className="mb-2">
          <Button
            variant="outline"
            onClick={() => {
              const rows = filteredOperations.map((op) => [
                op.created_at,
                op.m_inventory_operation_types?.name || '',
                op.partner_name || '',
                op.source_document_type || '',
                op.source_document_id || '',
                op.status,
              ]);
              exportCsv('operations.csv', ['Tanggal', 'Tipe', 'Partner', 'SourceType', 'SourceId', 'Status'], rows);
            }}
          >
            Export Operations CSV
          </Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Tipe</TableHead><TableHead>Partner</TableHead><TableHead>Source Type</TableHead><TableHead>Source ID</TableHead><TableHead>Status</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
          <TableBody>
            {paginatedOperations.map((op) => (
              <TableRow key={op.id}>
                <TableCell>{new Date(op.created_at).toLocaleString('id-ID')}</TableCell>
                <TableCell>{op.m_inventory_operation_types?.name || '-'}</TableCell>
                <TableCell>{op.partner_name || '-'}</TableCell>
                <TableCell>{op.source_document_type || '-'}</TableCell>
                <TableCell>{op.source_document_id || '-'}</TableCell>
                <TableCell>{op.status}</TableCell>
                <TableCell className="flex gap-2">
                  {op.status === 'submitted' && hasInventoryAction('approve') && <Button size="sm" onClick={() => approve(op.id)}>Approve</Button>}
                  {op.status === 'draft' && <Button size="sm" variant="outline" onClick={() => updateStatus(op.id, 'submitted')}>Submit</Button>}
                  {op.status === 'approved' && hasInventoryAction('complete') && <Button size="sm" variant="outline" onClick={() => updateStatus(op.id, 'completed')}>Complete</Button>}
                  {op.status !== 'completed' && op.status !== 'cancelled' && (
                    hasInventoryAction('cancel') && <Button size="sm" variant="outline" onClick={() => updateStatus(op.id, 'cancelled')}>Cancel</Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setSelectedOperationId(op.id)}>Detail</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t p-3">
          <span className="text-xs text-muted-foreground">Filtered rows: {filteredOperations.length}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <span className="text-xs text-muted-foreground">Page {page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-card p-3 space-y-2">
        <h3 className="text-sm font-semibold">Delivery Signature</h3>
        <form onSubmit={submitSignature} className="grid gap-2 md:grid-cols-4">
          <Select value={signatureForm.operation_id} onValueChange={(value) => setSignatureForm((prev) => ({ ...prev, operation_id: value }))}>
            <SelectTrigger><SelectValue placeholder="Pilih Operation" /></SelectTrigger>
            <SelectContent>
              {operations.map((op) => <SelectItem key={op.id} value={op.id}>{op.m_inventory_operation_types?.name} - {op.id.slice(0, 8)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Signer Name" value={signatureForm.signature_name} onChange={(e) => setSignatureForm((prev) => ({ ...prev, signature_name: e.target.value }))} />
          <Input placeholder="Signature URL" value={signatureForm.signature_url} onChange={(e) => setSignatureForm((prev) => ({ ...prev, signature_url: e.target.value }))} />
          <Button type="submit">Save Signature</Button>
        </form>
      </div>

      <OperationDetail operationId={selectedOperationId} />
    </div>
  );
}
