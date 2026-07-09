import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { inventoryModuleService } from '@/services/inventoryModuleService.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Button } from '@/components/ui/button.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Input } from '@/components/ui/input.jsx';
import { exportCsv } from '@/utils/exportCsv.js';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { exportSectionedCsv } from '@/utils/exportSectionedCsv.js';
import { validateSelectionByStatus } from '@/utils/queueSelectionValidation.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { notificationSenderService } from '@/services/notificationSenderService.js';

export default function NotificationQueue() {
  const { tenant } = useTenant();
  const { hasInventoryAction } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const [queueLogs, setQueueLogs] = useState([]);
  const [providerInfo, setProviderInfo] = useState({ mode: 'stub', ready: true, message: 'Stub mode aktif.' });

  const load = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const data = await inventoryModuleService.listNotificationQueue(tenant.id, status);
      setRows(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load().catch(console.error); }, [tenant?.id, status]);

  useEffect(() => {
    try {
      const info = notificationSenderService.validateConfig();
      setProviderInfo({ mode: info.mode, ready: true, message: `Provider ${info.mode} siap.` });
    } catch (error) {
      setProviderInfo({ mode: 'unknown', ready: false, message: error.message });
    }
  }, []);

  const enqueue = async () => {
    try {
      const result = await inventoryModuleService.enqueueInventoryAlerts(tenant.id);
      toast({ title: 'Queued', description: `${result.inserted} notification(s) ditambahkan ke queue.` });
      await load();
    } catch (error) {
      toast({ title: 'Gagal enqueue', description: error.message, variant: 'destructive' });
    }
  };

  const processItem = async (id) => {
    try {
      await inventoryModuleService.processNotificationQueueItem(id);
      toast({ title: 'Processed', description: 'Notification ditandai processed.' });
      await load();
    } catch (error) {
      toast({ title: 'Gagal process', description: error.message, variant: 'destructive' });
    }
  };

  const retryItem = async (id) => {
    try {
      await inventoryModuleService.retryNotificationQueueItem(id);
      toast({ title: 'Retry', description: 'Notification kembali ke draft.' });
      await load();
    } catch (error) {
      toast({ title: 'Gagal retry', description: error.message, variant: 'destructive' });
    }
  };

  const markFailed = async (id) => {
    try {
      await inventoryModuleService.markNotificationQueueFailed(id, 'Manual fail mark');
      toast({ title: 'Marked failed', description: 'Notification ditandai failed.' });
      await load();
    } catch (error) {
      toast({ title: 'Gagal mark failed', description: error.message, variant: 'destructive' });
    }
  };

  const openDetail = async (row) => {
    setActiveRow(row);
    const logs = await inventoryModuleService.listNotificationQueueLogs(row.id);
    setQueueLogs(logs);
    setDetailOpen(true);
  };

  const filteredRows = rows.filter((row) => {
    const created = new Date(row.created_at).getTime();
    if (startDate && created < new Date(startDate).getTime()) return false;
    if (endDate && created > new Date(`${endDate}T23:59:59`).getTime()) return false;
    if (!keyword.trim()) return true;
    const term = keyword.toLowerCase();
    return (row.notification_type || '').toLowerCase().includes(term)
      || (row.subject || '').toLowerCase().includes(term)
      || JSON.stringify(row.payload || {}).toLowerCase().includes(term)
      || (row.last_error || '').toLowerCase().includes(term);
  });

  const processedCount = filteredRows.filter((r) => r.status === 'processed').length;
  const failedCount = filteredRows.filter((r) => r.status === 'failed').length;
  const draftCount = filteredRows.filter((r) => r.status === 'draft').length;
  const doneCount = processedCount + failedCount;
  const successRate = doneCount > 0 ? ((processedCount / doneCount) * 100).toFixed(1) : '0.0';
  const avgDelayMinutes = (() => {
    const values = filteredRows
      .filter((r) => r.processed_at)
      .map((r) => (new Date(r.processed_at).getTime() - new Date(r.created_at).getTime()) / (1000 * 60))
      .filter((v) => Number.isFinite(v) && v >= 0);
    if (values.length === 0) return '0.0';
    return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
  })();

  const last24hCutoff = Date.now() - 24 * 60 * 60 * 1000;
  const last24hRows = filteredRows.filter((r) => new Date(r.created_at).getTime() >= last24hCutoff);
  const last24hFailed = last24hRows.filter((r) => r.status === 'failed').length;
  const last24hFailRatio = last24hRows.length > 0 ? ((last24hFailed / last24hRows.length) * 100).toFixed(1) : '0.0';

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  const allFilteredSelected = filteredRows.length > 0 && filteredRows.every((row) => selectedIds.includes(row.id));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Notification Queue</h2>
        <p className="text-sm text-muted-foreground">Queue notifikasi low stock dan expiry untuk channel email/push.</p>
        <div className={`rounded border p-2 text-xs ${providerInfo.ready ? 'border-emerald-300 text-emerald-700' : 'border-red-300 text-red-700'}`}>
          Provider: {providerInfo.mode} - {providerInfo.message}
        </div>
      <div className="grid gap-2 md:grid-cols-4 text-sm pt-2">
          <div className="rounded border p-2">Draft: {draftCount}</div>
          <div className="rounded border p-2">Processed: {processedCount}</div>
          <div className="rounded border p-2">Failed: {failedCount}</div>
          <div className="rounded border p-2">Filtered: {filteredRows.length}</div>
        </div>
        <p className="text-xs text-muted-foreground">Success Rate: {successRate}% | Avg Delay: {avgDelayMinutes} min | Fail Ratio 24h: {last24hFailRatio}%</p>
      </div>

      <div className="flex gap-2">
        {hasInventoryAction('generate_notification_queue') && <Button onClick={enqueue}>Generate Alerts Queue</Button>}
        {hasInventoryAction('process_notification_queue') && (
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const result = await inventoryModuleService.processDueNotificationQueue(tenant.id);
                toast({ title: 'Process Due', description: `${result.processed} item diproses (due queue).` });
                await load();
              } catch (error) {
                toast({ title: 'Gagal process due', description: error.message, variant: 'destructive' });
              }
            }}
          >
            Process Due Queue
          </Button>
        )}
        {hasInventoryAction('export_notification_queue') && (
          <Button
            variant="outline"
            onClick={() => {
              const rowsToExport = filteredRows.map((r) => [r.created_at, r.notification_type, r.channel, r.status, r.subject || '', r.retry_count || 0, r.last_error_code || '', r.last_error || '']);
              exportCsv('notification-queue.csv', ['Created', 'Type', 'Channel', 'Status', 'Subject', 'RetryCount', 'LastErrorCode', 'LastError'], rowsToExport);
            }}
          >
            Export CSV
          </Button>
        )}
        {hasInventoryAction('export_notification_queue') && (
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const logs = await inventoryModuleService.listNotificationQueueLogsByTenant(tenant.id);
                const rowsToExport = logs.map((log) => [
                  log.created_at,
                  log.action,
                  log.status_before || '',
                  log.status_after || '',
                  log.note || '',
                  log.t_inventory_notification_queue?.notification_type || '',
                  log.t_inventory_notification_queue?.channel || '',
                ]);
                exportCsv('notification-queue-action-logs.csv', ['Created', 'Action', 'StatusBefore', 'StatusAfter', 'Note', 'NotificationType', 'Channel'], rowsToExport);
              } catch (error) {
                toast({ title: 'Gagal export logs', description: error.message, variant: 'destructive' });
              }
            }}
          >
            Export Action Logs
          </Button>
        )}
        {hasInventoryAction('export_notification_queue') && (
          <Button
            variant="outline"
            onClick={() => {
              const summaryRows = [[filteredRows.length, draftCount, processedCount, failedCount, `${successRate}%`, avgDelayMinutes]];
              const rowsToExport = filteredRows.map((r) => [
                r.created_at,
                r.notification_type,
                r.channel,
                r.status,
                r.subject || '',
                r.retry_count || 0,
                r.last_error_code || '',
                r.last_error || '',
                r.processed_at || '',
                r.processed_by || '',
              ]);
              exportSectionedCsv('notification-queue-full.csv', [
                { title: 'Queue Summary', headers: ['Filtered', 'Draft', 'Processed', 'Failed', 'SuccessRate', 'AvgDelayMinutes'], rows: summaryRows },
                { title: 'Queue Rows', headers: ['Created', 'Type', 'Channel', 'Status', 'Subject', 'RetryCount', 'LastErrorCode', 'LastError', 'ProcessedAt', 'ProcessedBy'], rows: rowsToExport },
              ]);
            }}
          >
            Export Full CSV
          </Button>
        )}
        <div className="w-60">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Filter Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">all</SelectItem>
              <SelectItem value="draft">draft</SelectItem>
              <SelectItem value="processed">processed</SelectItem>
              <SelectItem value="failed">failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-72">
          <Input placeholder="Cari type/subject/payload/error" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-48" />
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-48" />
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            if (allFilteredSelected) {
              setSelectedIds((prev) => prev.filter((id) => !filteredRows.some((row) => row.id === id)));
            } else {
              setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredRows.map((row) => row.id)])));
            }
          }}
        >
          {allFilteredSelected ? 'Unselect Filtered' : 'Select All Filtered'}
        </Button>
        {hasInventoryAction('process_notification_queue') && (
          <Button
            variant="outline"
            disabled={selectedIds.length === 0}
            onClick={async () => {
              const validation = validateSelectionByStatus(rows, selectedIds, 'draft');
              if (!validation.valid) {
                toast({ title: 'Invalid selection', description: validation.message, variant: 'destructive' });
                return;
              }
              try {
                await inventoryModuleService.processNotificationQueueBulk(selectedIds);
                toast({ title: 'Processed', description: `${selectedIds.length} item diproses.` });
                setSelectedIds([]);
                await load();
              } catch (error) {
                toast({ title: 'Gagal process bulk', description: error.message, variant: 'destructive' });
              }
            }}
          >
            Process Selected
          </Button>
        )}
        {hasInventoryAction('process_notification_queue') && (
          <Button
            variant="outline"
            disabled={selectedIds.length === 0}
            onClick={async () => {
              const validation = validateSelectionByStatus(rows, selectedIds, 'failed');
              if (!validation.valid) {
                toast({ title: 'Invalid selection', description: validation.message, variant: 'destructive' });
                return;
              }
              try {
                await inventoryModuleService.retryNotificationQueueBulk(selectedIds);
                toast({ title: 'Retry', description: `${selectedIds.length} item diretry.` });
                setSelectedIds([]);
                await load();
              } catch (error) {
                toast({ title: 'Gagal retry bulk', description: error.message, variant: 'destructive' });
              }
            }}
          >
            Retry Selected
          </Button>
        )}
        {hasInventoryAction('process_notification_queue') && (
          <Button
            variant="outline"
            disabled={selectedIds.length === 0}
            onClick={async () => {
              if (selectedIds.some((id) => rows.find((r) => r.id === id)?.status === 'failed')) {
                toast({ title: 'Invalid selection', description: 'Bulk mark failed abaikan item yang sudah failed.', variant: 'destructive' });
                return;
              }
              try {
                await inventoryModuleService.markNotificationQueueFailedBulk(selectedIds, 'Manual bulk fail mark');
                toast({ title: 'Marked Failed', description: `${selectedIds.length} item ditandai failed.` });
                setSelectedIds([]);
                await load();
              } catch (error) {
                toast({ title: 'Gagal mark failed bulk', description: error.message, variant: 'destructive' });
              }
            }}
          >
            Mark Failed Selected
          </Button>
        )}
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Select</TableHead><TableHead>Created</TableHead><TableHead>Type</TableHead><TableHead>Channel</TableHead><TableHead>Status</TableHead><TableHead>Subject</TableHead><TableHead>Error Code</TableHead><TableHead>Last Error</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="h-20 text-center text-muted-foreground">Memuat queue...</TableCell></TableRow>
            ) : filteredRows.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="h-20 text-center text-muted-foreground">Queue kosong.</TableCell></TableRow>
            ) : paginatedRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(row.id)}
                    onCheckedChange={(checked) => setSelectedIds((prev) => checked ? [...prev, row.id] : prev.filter((id) => id !== row.id))}
                  />
                </TableCell>
                <TableCell>{new Date(row.created_at).toLocaleString('id-ID')}</TableCell>
                <TableCell>{row.notification_type}</TableCell>
                <TableCell>{row.channel}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell className="text-xs">{row.subject}</TableCell>
                <TableCell className="text-xs">{row.last_error_code || '-'}</TableCell>
                <TableCell className="text-xs text-red-600">{row.last_error || '-'}</TableCell>
                <TableCell className="flex gap-2">
                  {row.status === 'draft' && hasInventoryAction('process_notification_queue') && <Button size="sm" variant="outline" onClick={() => processItem(row.id)}>Process</Button>}
                  {row.status === 'failed' && hasInventoryAction('process_notification_queue') && <Button size="sm" variant="outline" onClick={() => retryItem(row.id)}>Retry</Button>}
                  {row.status !== 'failed' && hasInventoryAction('process_notification_queue') && <Button size="sm" variant="outline" onClick={() => markFailed(row.id)}>Mark Failed</Button>}
                  <Button size="sm" variant="outline" onClick={() => openDetail(row)}>Detail</Button>
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
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Notification Queue Detail</DialogTitle></DialogHeader>
          {activeRow && (
            <div className="space-y-3 text-sm">
              <p><span className="font-semibold">Type:</span> {activeRow.notification_type}</p>
              <p><span className="font-semibold">Subject:</span> {activeRow.subject || '-'}</p>
              <p><span className="font-semibold">Status:</span> {activeRow.status}</p>
              <p><span className="font-semibold">Retry Count:</span> {activeRow.retry_count || 0}</p>
              <p><span className="font-semibold">Last Error:</span> {activeRow.last_error || '-'}</p>
              <div className="rounded border p-2 text-xs bg-muted/30">
                <p className="font-semibold mb-1">Payload / Delivery</p>
                <pre className="whitespace-pre-wrap break-all">{JSON.stringify(activeRow.payload || {}, null, 2)}</pre>
              </div>
              <div>
                <p className="font-semibold mb-1">Action History</p>
                <div className="max-h-64 overflow-auto rounded border">
                  {queueLogs.length === 0 ? (
                    <p className="p-3 text-xs text-muted-foreground">Belum ada riwayat action.</p>
                  ) : queueLogs.map((log) => (
                    <div key={log.id} className="border-b p-2 text-xs">
                      <div>{new Date(log.created_at).toLocaleString('id-ID')} - {log.action}</div>
                      <div>{log.status_before || '-'} {'→'} {log.status_after || '-'}</div>
                      <div className="text-muted-foreground">{log.note || '-'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
