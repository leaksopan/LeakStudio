import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { inventoryModuleService } from '@/services/inventoryModuleService.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Button } from '@/components/ui/button.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Input } from '@/components/ui/input.jsx';
import { exportCsv } from '@/utils/exportCsv.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { filterQueueRows, buildTrendRows } from '@/utils/reorderQueueMetrics.js';
import { mapInventoryError } from '@/utils/inventoryErrorMap.js';
import { validateSelectionByStatus } from '@/utils/queueSelectionValidation.js';
import { exportSectionedCsv } from '@/utils/exportSectionedCsv.js';

export default function ReorderQueue() {
  const { tenant } = useTenant();
  const { hasInventoryAction } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('all');
  const [actionTypeFilter, setActionTypeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  const load = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const data = await inventoryModuleService.listReorderQueue(tenant.id, status);
      setRows(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load().catch(console.error); }, [tenant?.id, status]);

  const processItem = async (id) => {
    try {
      await inventoryModuleService.processReorderQueueItem(id);
      toast({ title: 'Processed', description: 'Queue item diproses.' });
      await load();
    } catch (error) {
      toast({ title: 'Gagal process', description: mapInventoryError(error), variant: 'destructive' });
    }
  };

  const retryItem = async (id) => {
    try {
      await inventoryModuleService.retryReorderQueueItem(id);
      toast({ title: 'Retry', description: 'Queue item dikembalikan ke draft.' });
      await load();
    } catch (error) {
      toast({ title: 'Gagal retry', description: mapInventoryError(error), variant: 'destructive' });
    }
  };

  const requeueItem = async (id) => {
    try {
      await inventoryModuleService.requeueProcessedItem(id);
      toast({ title: 'Requeued', description: 'Item processed dikembalikan ke draft.' });
      await load();
    } catch (error) {
      toast({ title: 'Gagal requeue', description: mapInventoryError(error), variant: 'destructive' });
    }
  };

  const markFailedItem = async (id) => {
    try {
      await inventoryModuleService.markReorderQueueFailed(id, 'Manual fail mark');
      toast({ title: 'Marked failed', description: 'Queue item ditandai failed.' });
      await load();
    } catch (error) {
      toast({ title: 'Gagal mark failed', description: mapInventoryError(error), variant: 'destructive' });
    }
  };

  const processSelected = async () => {
    if (selectedIds.length === 0) return;
    const validation = validateSelectionByStatus(rows, selectedIds, 'draft');
    if (!validation.valid) {
      toast({ title: 'Invalid selection', description: validation.message, variant: 'destructive' });
      return;
    }
    try {
      await inventoryModuleService.processReorderQueueBulk(selectedIds);
      toast({ title: 'Processed', description: `${selectedIds.length} item diproses.` });
      setSelectedIds([]);
      await load();
    } catch (error) {
      toast({ title: 'Gagal process bulk', description: mapInventoryError(error), variant: 'destructive' });
    }
  };

  const retrySelected = async () => {
    if (selectedIds.length === 0) return;
    const validation = validateSelectionByStatus(rows, selectedIds, 'failed');
    if (!validation.valid) {
      toast({ title: 'Invalid selection', description: validation.message, variant: 'destructive' });
      return;
    }
    try {
      await inventoryModuleService.retryReorderQueueBulk(selectedIds);
      toast({ title: 'Retry', description: `${selectedIds.length} item dikembalikan ke draft.` });
      setSelectedIds([]);
      await load();
    } catch (error) {
      toast({ title: 'Gagal retry bulk', description: mapInventoryError(error), variant: 'destructive' });
    }
  };

  const toggleRow = (id, checked) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  const filteredRows = filterQueueRows(rows, {
    actionType: actionTypeFilter,
    startDate,
    endDate,
    keyword,
  });

  const trendRows = buildTrendRows(filteredRows, 7);

  const processedCount = filteredRows.filter((r) => r.status === 'processed').length;
  const failedCount = filteredRows.filter((r) => r.status === 'failed').length;
  const doneCount = processedCount + failedCount;
  const successRate = doneCount > 0 ? ((processedCount / doneCount) * 100).toFixed(1) : '0.0';

  const avgProcessingMinutes = (() => {
    const durations = filteredRows
      .filter((r) => r.processed_at)
      .map((r) => {
        const start = new Date(r.created_at).getTime();
        const end = new Date(r.processed_at).getTime();
        if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
        return (end - start) / (1000 * 60);
      })
      .filter((v) => v !== null);
    if (durations.length === 0) return '0.0';
    const sum = durations.reduce((acc, cur) => acc + cur, 0);
    return (sum / durations.length).toFixed(1);
  })();

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Reorder Queue</h2>
        <p className="text-sm text-muted-foreground">Monitor dan proses action queue hasil automation reordering.</p>
        <div className="grid gap-2 md:grid-cols-4 text-sm">
          <div className="rounded border p-2">Draft: {rows.filter((r) => r.status === 'draft').length}</div>
          <div className="rounded border p-2">Queued: {rows.filter((r) => r.status === 'queued').length}</div>
          <div className="rounded border p-2">Processed: {rows.filter((r) => r.status === 'processed').length}</div>
          <div className="rounded border p-2">Failed: {rows.filter((r) => r.status === 'failed').length}</div>
        </div>
      </div>

      <div className="max-w-xs">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue placeholder="Filter Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">all</SelectItem>
            <SelectItem value="draft">draft</SelectItem>
            <SelectItem value="queued">queued</SelectItem>
            <SelectItem value="processed">processed</SelectItem>
            <SelectItem value="failed">failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
          <SelectTrigger><SelectValue placeholder="Filter Action Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">all</SelectItem>
            <SelectItem value="MR">MR</SelectItem>
            <SelectItem value="INTERNAL_TRANSFER">INTERNAL_TRANSFER</SelectItem>
            <SelectItem value="PR">PR</SelectItem>
            <SelectItem value="RFQ">RFQ</SelectItem>
            <SelectItem value="PO">PO</SelectItem>
            <SelectItem value="EMAIL">EMAIL</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>

      <div className="max-w-md">
        <Input
          placeholder="Cari queue id/rule id/error/payload"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        {hasInventoryAction('process_reorder_queue') && <Button variant="outline" onClick={processSelected} disabled={selectedIds.length === 0}>Process Selected</Button>}
        {hasInventoryAction('retry_reorder_queue') && <Button variant="outline" onClick={retrySelected} disabled={selectedIds.length === 0}>Retry Selected</Button>}
        {hasInventoryAction('export_reorder_queue') && (
          <Button
            variant="outline"
            onClick={() => {
              const rowsToExport = filteredRows.map((row) => [
                row.created_at,
                row.rule_id || '',
                row.action_type,
                row.status,
                row.last_error || '',
                row.processed_at || '',
                row.processed_by || '',
                row.retry_count || 0,
              ]);
              exportCsv('reorder-queue-audit.csv', ['Created', 'RuleId', 'ActionType', 'Status', 'LastError', 'ProcessedAt', 'ProcessedBy', 'RetryCount'], rowsToExport);
            }}
          >
            Export Queue CSV
          </Button>
        )}
        {hasInventoryAction('export_reorder_queue') && (
          <Button
            variant="outline"
            onClick={() => {
              const summaryRows = [[filteredRows.length, processedCount, failedCount, `${successRate}%`, avgProcessingMinutes]];
              const queueRows = filteredRows.map((row) => [
                row.created_at,
                row.rule_id || '',
                row.action_type,
                row.status,
                row.last_error || '',
                row.processed_at || '',
                row.processed_by || '',
                row.retry_count || 0,
              ]);
              exportSectionedCsv('reorder-queue-full.csv', [
                { title: 'Queue Summary', headers: ['Filtered', 'Processed', 'Failed', 'SuccessRate', 'AvgProcessingMinutes'], rows: summaryRows },
                { title: 'Queue Rows', headers: ['Created', 'RuleId', 'ActionType', 'Status', 'LastError', 'ProcessedAt', 'ProcessedBy', 'RetryCount'], rows: queueRows },
              ]);
            }}
          >
            Export Full Queue CSV
          </Button>
        )}
      </div>

      <div className="rounded-md border p-3">
        <h3 className="mb-2 text-sm font-semibold">Queue Trend (7 Hari Terakhir)</h3>
        <div className="space-y-1 text-xs">
          {trendRows.length === 0 ? <p className="text-muted-foreground">Belum ada data trend.</p> : trendRows.map(([date, values]) => (
            <p key={date}>{date} - processed: {values.processed}, failed: {values.failed}</p>
          ))}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-4 text-sm">
        <div className="rounded border p-2">Filtered: {filteredRows.length}</div>
        <div className="rounded border p-2">Processed: {processedCount}</div>
        <div className="rounded border p-2">Failed: {failedCount}</div>
        <div className="rounded border p-2">Success Rate: {successRate}% | Avg Proc: {avgProcessingMinutes} min</div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Select</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Rule ID</TableHead>
              <TableHead>Action Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Retry</TableHead>
              <TableHead>Last Error</TableHead>
              <TableHead>Payload</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
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
                    onCheckedChange={(checked) => toggleRow(row.id, Boolean(checked))}
                  />
                </TableCell>
                <TableCell>{new Date(row.created_at).toLocaleString('id-ID')}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{row.rule_id || '-'}</TableCell>
                <TableCell>{row.action_type}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell className="text-right">{row.retry_count || 0}</TableCell>
                <TableCell className="text-xs text-red-600">{row.last_error || '-'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{JSON.stringify(row.payload || {})}</TableCell>
                <TableCell className="flex gap-2">
                  {row.status === 'draft' && hasInventoryAction('process_reorder_queue') && <Button size="sm" onClick={() => processItem(row.id)}>Process</Button>}
                  {row.status === 'failed' && hasInventoryAction('retry_reorder_queue') && <Button size="sm" variant="outline" onClick={() => retryItem(row.id)}>Retry</Button>}
                  {row.status === 'processed' && hasInventoryAction('requeue_processed') && <Button size="sm" variant="outline" onClick={() => requeueItem(row.id)}>Requeue</Button>}
                  {row.status !== 'failed' && hasInventoryAction('mark_reorder_failed') && <Button size="sm" variant="outline" onClick={() => markFailedItem(row.id)}>Mark Failed</Button>}
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
    </div>
  );
}
