import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { inventoryModuleService } from '@/services/inventoryModuleService.js';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { mapInventoryError } from '@/utils/inventoryErrorMap.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

export default function PickingWaves() {
  const { tenant } = useTenant();
  const { hasInventoryAction } = useAuth();
  const { toast } = useToast();
  const [waves, setWaves] = useState([]);
  const [form, setForm] = useState({ wave_number: '', scheduled_date: '' });
  const [operationLines, setOperationLines] = useState([]);
  const [selectedWaveId, setSelectedWaveId] = useState('');
  const [selectedLineId, setSelectedLineId] = useState('');
  const [waveLines, setWaveLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const load = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const [waveData, opLines] = await Promise.all([
        inventoryModuleService.listPickingWaves(tenant.id),
        inventoryModuleService.listOperationLinesForPicking(tenant.id),
      ]);
      setWaves(waveData);
      setOperationLines(opLines);
    } catch (error) {
      setErrorMessage(error.message || 'Gagal memuat picking waves.');
    } finally {
      setLoading(false);
    }
  };

  const loadWaveLines = async (waveId) => {
    if (!waveId) {
      setWaveLines([]);
      return;
    }
    const rows = await inventoryModuleService.listWaveLines(waveId);
    setWaveLines(rows);
  };

  useEffect(() => {
    load().catch(console.error);
  }, [tenant?.id]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.wave_number.trim()) {
      toast({ title: 'Validasi gagal', description: 'Wave number wajib diisi.', variant: 'destructive' });
      return;
    }
    await inventoryModuleService.createPickingWave(form);
    setForm({ wave_number: '', scheduled_date: '' });
    await load();
  };

  const attachLine = async () => {
    if (!selectedWaveId || !selectedLineId) return;
    try {
      await inventoryModuleService.attachLineToWave({ wave_id: selectedWaveId, operation_line_id: selectedLineId });
      toast({ title: 'Sukses', description: 'Operation line berhasil di-attach ke wave.' });
      setSelectedLineId('');
      await loadWaveLines(selectedWaveId);
    } catch (error) {
      toast({ title: 'Gagal attach', description: mapInventoryError(error), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Picking Waves</h2>
        <p className="text-sm text-muted-foreground">Kelompokkan delivery note dalam gelombang picking.</p>
        {loading && <p className="text-xs text-muted-foreground">Memuat data...</p>}
        {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}
      </div>

      <form onSubmit={submit} className="grid gap-2 md:grid-cols-3">
        <Input
          placeholder="Wave Number"
          value={form.wave_number}
          onChange={(e) => setForm((prev) => ({ ...prev, wave_number: e.target.value }))}
        />
        <Input
          type="date"
          value={form.scheduled_date}
          onChange={(e) => setForm((prev) => ({ ...prev, scheduled_date: e.target.value }))}
        />
        <Button type="submit">Create Wave</Button>
      </form>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Wave Number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Scheduled Date</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {waves.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                  Belum ada picking wave. Buat wave baru untuk mulai grouping picking.
                </TableCell>
              </TableRow>
            ) : waves.map((wave) => (
              <TableRow key={wave.id}>
                <TableCell>{wave.wave_number}</TableCell>
                <TableCell>{wave.status}</TableCell>
                <TableCell>{wave.scheduled_date || '-'}</TableCell>
                <TableCell>{new Date(wave.created_at).toLocaleString('id-ID')}</TableCell>
                <TableCell><Button size="sm" variant="outline" onClick={() => { setSelectedWaveId(wave.id); loadWaveLines(wave.id).catch(console.error); }}>Manage</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedWaveId && (
        <div className="space-y-3 rounded-md border bg-card p-3">
          <h3 className="font-semibold">Manage Wave Lines</h3>
          <div className="grid gap-2 md:grid-cols-3">
            <Select value={selectedLineId} onValueChange={setSelectedLineId}>
              <SelectTrigger><SelectValue placeholder="Pilih Operation Line" /></SelectTrigger>
              <SelectContent>
                {operationLines.map((line) => (
                  <SelectItem key={line.id} value={line.id}>{line.m_products?.name} - Qty {line.qty}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasInventoryAction('attach_wave') && <Button type="button" onClick={attachLine}>Attach Line</Button>}
            <Button type="button" variant="outline" onClick={() => inventoryModuleService.massUpdateWaveLines(selectedWaveId, 'picked').then(() => loadWaveLines(selectedWaveId))}>Mark All Picked</Button>
          </div>

          <Table>
            <TableHeader><TableRow><TableHead>Produk</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {waveLines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                    Belum ada line di wave ini. Attach operation line terlebih dahulu.
                  </TableCell>
                </TableRow>
              ) : waveLines.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.t_inventory_operation_lines?.m_products?.name || '-'}</TableCell>
                  <TableCell className="text-right">{row.t_inventory_operation_lines?.qty || '-'}</TableCell>
                  <TableCell>{row.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
