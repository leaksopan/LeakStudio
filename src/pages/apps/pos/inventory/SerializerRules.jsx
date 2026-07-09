import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { inventoryModuleService } from '@/services/inventoryModuleService.js';
import { supabase } from '@/lib/supabase.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { useToast } from '@/components/ui/use-toast.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { exportCsv } from '@/utils/exportCsv.js';
import { useMemo } from 'react';

export default function SerializerRules() {
  const { tenant } = useTenant();
  const { hasInventoryAction } = useAuth();
  const { toast } = useToast();
  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [generatedCode, setGeneratedCode] = useState('');
  const [form, setForm] = useState({ category_id: '', code_prefix: '', sequence_padding: '6', include_date: true, mode_type: 'SKU' });
  const [logs, setLogs] = useState([]);
  const [logRuleFilter, setLogRuleFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('active');
  const [logStartDate, setLogStartDate] = useState('');
  const [logEndDate, setLogEndDate] = useState('');
  const [editingRuleId, setEditingRuleId] = useState('');

  const load = async () => {
    if (!tenant?.id) return;
    const [ruleRows, { data: cats }, logRows] = await Promise.all([
      inventoryModuleService.listSerializerRules(tenant.id),
      supabase.from('m_categories').select('id, name').eq('tenant_id', tenant.id),
      inventoryModuleService.listSerialLogs(tenant.id, { startDate: logStartDate, endDate: logEndDate }),
    ]);
    setRules(ruleRows);
    setCategories(cats || []);
    setLogs(logRows || []);
  };

  useEffect(() => { load().catch(console.error); }, [tenant?.id, logStartDate, logEndDate]);

  const filteredLogs = useMemo(
    () => logs.filter((l) => logRuleFilter === 'all' || l.rule_id === logRuleFilter),
    [logs, logRuleFilter],
  );

  const submit = async (e) => {
    e.preventDefault();
    if (!hasInventoryAction('create_serializer_rule')) {
      toast({ title: 'Akses ditolak', description: 'Anda tidak memiliki izin membuat serializer rule.', variant: 'destructive' });
      return;
    }
    await inventoryModuleService.createSerializerRule({
      category_id: form.category_id || null,
      code_prefix: form.code_prefix,
      sequence_padding: Number(form.sequence_padding || 6),
      include_date: form.include_date,
      mode_type: form.mode_type,
    });
    setForm({ category_id: '', code_prefix: '', sequence_padding: '6', include_date: true, mode_type: 'SKU' });
    toast({ title: 'Sukses', description: 'Serializer rule berhasil dibuat.' });
    await load();
  };

  const generateSample = async (ruleId) => {
    if (!hasInventoryAction('generate_serializer_code')) {
      toast({ title: 'Akses ditolak', description: 'Anda tidak memiliki izin generate serializer code.', variant: 'destructive' });
      return;
    }
    const code = await inventoryModuleService.generateSerializedCode({ ruleId });
    setGeneratedCode(code);
    toast({ title: 'Generated', description: code });
  };

  const saveRuleEdit = async (rule) => {
    if (!hasInventoryAction('edit_serializer_rule')) {
      toast({ title: 'Akses ditolak', description: 'Tidak punya izin edit serializer rule.', variant: 'destructive' });
      return;
    }
    await inventoryModuleService.updateSerializerRule(rule.id, rule);
    toast({ title: 'Updated', description: 'Serializer rule diperbarui.' });
    setEditingRuleId('');
    await load();
  };

  const deactivateRule = async (ruleId) => {
    if (!hasInventoryAction('deactivate_serializer_rule')) {
      toast({ title: 'Akses ditolak', description: 'Tidak punya izin deactivate serializer rule.', variant: 'destructive' });
      return;
    }
    await inventoryModuleService.deactivateSerializerRule(ruleId);
    toast({ title: 'Deactivated', description: 'Serializer rule dinonaktifkan.' });
    await load();
  };

  const reactivateRule = async (ruleId) => {
    if (!hasInventoryAction('reactivate_serializer_rule')) {
      toast({ title: 'Akses ditolak', description: 'Tidak punya izin reactivate serializer rule.', variant: 'destructive' });
      return;
    }
    await inventoryModuleService.reactivateSerializerRule(ruleId);
    toast({ title: 'Reactivated', description: 'Serializer rule diaktifkan kembali.' });
    await load();
  };

  const filteredRules = rules.filter((rule) => {
    if (activeFilter === 'all') return true;
    return activeFilter === 'active' ? rule.is_active : !rule.is_active;
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Serializer Rules</h2>
        <p className="text-sm text-muted-foreground">Atur format auto serialize barcode/lot/serial per kategori produk.</p>
      </div>

      <form onSubmit={submit} className="grid gap-2 md:grid-cols-5">
        <Select value={form.category_id} onValueChange={(value) => setForm((p) => ({ ...p, category_id: value }))}>
          <SelectTrigger><SelectValue placeholder="Kategori" /></SelectTrigger>
          <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Input placeholder="Code Prefix (e.g. SKU-)" value={form.code_prefix} onChange={(e) => setForm((p) => ({ ...p, code_prefix: e.target.value }))} />
        <Input type="number" placeholder="Padding" value={form.sequence_padding} onChange={(e) => setForm((p) => ({ ...p, sequence_padding: e.target.value }))} />
        <Select value={form.mode_type} onValueChange={(value) => setForm((p) => ({ ...p, mode_type: value }))}>
          <SelectTrigger><SelectValue placeholder="Mode" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="SKU">SKU</SelectItem>
            <SelectItem value="LOT">LOT</SelectItem>
            <SelectItem value="SERIAL">SERIAL</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 rounded border px-3">
          <Checkbox checked={form.include_date} onCheckedChange={(checked) => setForm((p) => ({ ...p, include_date: Boolean(checked) }))} />
          <span className="text-sm">Include Date</span>
        </div>
        <Button type="submit">Create Rule</Button>
      </form>

      <div className="max-w-xs">
        <Select value={activeFilter} onValueChange={setActiveFilter}>
          <SelectTrigger><SelectValue placeholder="Filter Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded border p-3 text-sm text-muted-foreground">
        Preview format: <span className="font-mono">{form.mode_type}-{form.code_prefix || 'PREFIX'}{form.include_date ? 'YYYYMMDD' : ''}{String(1).padStart(Number(form.sequence_padding || 6), '0')}</span>
      </div>

      {generatedCode && <p className="text-sm text-muted-foreground">Last Generated: <span className="font-mono">{generatedCode}</span></p>}

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Kategori</TableHead><TableHead>Mode</TableHead><TableHead>Prefix</TableHead><TableHead>Padding</TableHead><TableHead>Include Date</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
          <TableBody>
            {rules.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-20 text-center text-muted-foreground">Belum ada serializer rule.</TableCell></TableRow>
            ) : filteredRules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>{rule.m_categories?.name || '-'}</TableCell>
                <TableCell>{rule.mode_type || 'SKU'}</TableCell>
                <TableCell>{rule.code_prefix}</TableCell>
                <TableCell>{rule.sequence_padding}</TableCell>
                <TableCell>{rule.include_date ? 'Yes' : 'No'}</TableCell>
                <TableCell className="flex gap-2">
                  <Badge variant={rule.is_active ? 'default' : 'secondary'}>{rule.is_active ? 'Active' : 'Inactive'}</Badge>
                  <Button size="sm" variant="outline" onClick={() => generateSample(rule.id)}>Generate Sample</Button>
                  {editingRuleId !== rule.id ? <Button size="sm" variant="outline" disabled={!rule.is_active} onClick={() => setEditingRuleId(rule.id)}>Edit</Button> : <Button size="sm" variant="outline" onClick={() => saveRuleEdit(rule)}>Save</Button>}
                  {rule.is_active
                    ? <Button size="sm" variant="outline" onClick={() => deactivateRule(rule.id)}>Deactivate</Button>
                    : <Button size="sm" variant="outline" onClick={() => reactivateRule(rule.id)}>Reactivate</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {hasInventoryAction('view_serializer_logs') && (
        <div className="space-y-2 rounded-md border bg-card p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Generated Serial Logs</h3>
          <div className="w-60">
            <Select value={logRuleFilter} onValueChange={setLogRuleFilter}>
              <SelectTrigger><SelectValue placeholder="Filter Rule" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rules</SelectItem>
                {rules.map((rule) => <SelectItem key={rule.id} value={rule.id}>{rule.mode_type || 'SKU'} - {rule.code_prefix}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            const rowsToExport = filteredLogs
              .map((log) => [
                log.generated_at,
                log.m_barcode_serializer_rules?.mode_type || '-',
                log.m_barcode_serializer_rules?.code_prefix || '-',
                log.m_products?.name || '-',
                log.generated_code,
              ]);
            exportCsv('serializer-logs.csv', ['GeneratedAt', 'Mode', 'Prefix', 'Product', 'Code'], rowsToExport);
          }}
        >
          Export Logs CSV
        </Button>

        <Table>
          <TableHeader><TableRow><TableHead>Generated At</TableHead><TableHead>Rule</TableHead><TableHead>Produk</TableHead><TableHead>Code</TableHead></TableRow></TableHeader>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{new Date(log.generated_at).toLocaleString('id-ID')}</TableCell>
                <TableCell>{log.m_barcode_serializer_rules?.mode_type || '-'} / {log.m_barcode_serializer_rules?.code_prefix || '-'}</TableCell>
                <TableCell>{log.m_products?.name || '-'}</TableCell>
                <TableCell className="font-mono text-xs">{log.generated_code}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      )}
    </div>
  );
}
