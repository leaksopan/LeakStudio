import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { inventoryModuleService } from '@/services/inventoryModuleService.js';

export default function InventoryDashboard() {
  const { tenant } = useTenant();
  const [data, setData] = useState({ upcomingOperations: [], reorderingRules: [], expiringBatches: [] });
  const [notifications, setNotifications] = useState({ expiring: [], lowStock: [], pendingApprovals: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant?.id) return;
    Promise.all([
      inventoryModuleService.getDashboard(tenant.id),
      inventoryModuleService.getNotificationCenter(tenant.id),
    ])
      .then(([dashboardData, notificationData]) => {
        setData(dashboardData);
        setNotifications(notificationData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tenant?.id]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Inventory Dashboard</h2>
      {loading && <p className="text-sm text-muted-foreground">Memuat ringkasan inventory...</p>}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border p-4"><p className="text-sm text-muted-foreground">Upcoming Operations</p><p className="text-3xl font-bold">{data.upcomingOperations.length}</p></div>
        <div className="rounded-md border p-4"><p className="text-sm text-muted-foreground">Reordering Rules</p><p className="text-3xl font-bold">{data.reorderingRules.length}</p></div>
        <div className="rounded-md border p-4"><p className="text-sm text-muted-foreground">Expiring Batches (30 hari)</p><p className="text-3xl font-bold">{data.expiringBatches.length}</p></div>
      </div>

      <div className="rounded-md border p-4">
        <h3 className="mb-3 text-lg font-semibold">Notification Center</h3>
        <div className="grid gap-3 md:grid-cols-3 text-sm">
          <div className="rounded border p-3">
            <p className="text-muted-foreground">Pending Approvals</p>
            <p className="text-2xl font-bold">{notifications.pendingApprovals.length}</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-muted-foreground">Low Stock Alerts</p>
            <p className="text-2xl font-bold">{notifications.lowStock.length}</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-muted-foreground">Expiring Batches</p>
            <p className="text-2xl font-bold">{notifications.expiring.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
