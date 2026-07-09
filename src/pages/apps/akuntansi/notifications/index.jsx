import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { supabase } from '@/lib/supabase.js';
import { downloadCsv } from '@/utils/csvExport.js';
import { Button } from '@/components/ui/button.jsx';
import DataToolbar from '@/components/shared/DataToolbar.jsx';
import Pager from '@/components/shared/Pager.jsx';

export default function AkuntansiNotificationsPage() {
  const { tenant } = useTenant();
  const [rows, setRows] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [filterType, filterDate, search]);

  const load = async () => {
    if (!tenant?.id) return;
    let query = supabase
      .from('akuntansi_notifications')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, (page * pageSize) - 1);
    if (filterType !== 'all') query = query.eq('event_type', filterType);
    if (filterDate) query = query.gte('created_at', `${filterDate}T00:00:00.000Z`).lte('created_at', `${filterDate}T23:59:59.999Z`);
    if (search) query = query.or(`title.ilike.%${search}%,message.ilike.%${search}%`);
    const { data, error, count } = await query;
    if (error) {
      setRows([]);
      return;
    }
    setRows(data || []);
    setTotal(count || 0);
  };

  useEffect(() => {
    let active = true;
    if (!tenant?.id) return () => { active = false; };

    (async () => { await load(); })();

    return () => { active = false; };
  }, [tenant?.id, filterType, filterDate, search, page, pageSize]);

  const markAsRead = async (id) => {
    if (!tenant?.id) return;
    await supabase
      .from('akuntansi_notifications')
      .update({ is_read: true })
      .eq('tenant_id', tenant.id)
      .eq('id', id);
    await load();
  };

  const markAllAsRead = async () => {
    if (!tenant?.id) return;
    await supabase
      .from('akuntansi_notifications')
      .update({ is_read: true })
      .eq('tenant_id', tenant.id)
      .eq('is_read', false);
    await load();
  };

  const exportCsv = () => {
    const rowsCsv = [
      ['Event', 'Title', 'Message', 'Read', 'Created At'],
      ...rows.map((r) => [r.event_type, r.title, r.message || '', r.is_read ? 'Yes' : 'No', r.created_at]),
    ];
    downloadCsv(`akuntansi-notifications-${new Date().toISOString().slice(0, 10)}.csv`, rowsCsv);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-xl font-semibold">Workflow Notifications</h2>
      <DataToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari judul/pesan..."
        actions={(
          <>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">Semua Event</option>
              <option value="payment_voucher_requested">Requested</option>
              <option value="payment_voucher_approved">Approved</option>
              <option value="payment_voucher_rejected">Rejected</option>
            </select>
            <input className="h-10 rounded-md border bg-background px-3 text-sm" type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
            <Button variant="outline" size="sm" onClick={markAllAsRead}>Tandai semua sudah dibaca</Button>
            <Button variant="outline" size="sm" onClick={exportCsv}>Export CSV</Button>
          </>
        )}
      />
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada notifikasi akuntansi.</p>
      ) : rows.map((row) => (
        <div key={row.id} className="rounded border px-3 py-2 text-sm">
          <p className="font-medium">{row.title} {!row.is_read && <span className="text-xs text-primary">(baru)</span>}</p>
          <p className="text-muted-foreground">{row.message || '-'}</p>
          <p className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString('id-ID')}</p>
          {!row.is_read && <button className="mt-2 text-xs underline" onClick={() => markAsRead(row.id)}>Tandai sudah dibaca</button>}
        </div>
      ))}
      <Pager
        page={page}
        totalPages={totalPages}
        totalItems={total}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
      />
    </div>
  );
}
