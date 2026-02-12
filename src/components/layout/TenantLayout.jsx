import { Outlet, Link, useLocation, useParams, Navigate } from 'react-router-dom';
import { TenantProvider, useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { resolveIcon } from '@/lib/iconMap';
import {
    Layers, LogOut, Store, LayoutDashboard, Loader2
} from 'lucide-react';

/* ─────────────── Wrapper with Provider ─────────────── */
export default function TenantLayout() {
    return (
        <TenantProvider>
            <TenantLayoutInner />
        </TenantProvider>
    );
}

/* ─────────────── Inner Layout ─────────────── */
function TenantLayoutInner() {
    const { tenant, apps, modules, loading, error } = useTenant();
    const { profile, signOut } = useAuth();
    const { tenantSlug, appSlug } = useParams();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !tenant) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-background gap-4">
                <p className="text-lg text-destructive font-medium">Tenant tidak ditemukan</p>
                <Button variant="outline" asChild>
                    <Link to="/">Kembali</Link>
                </Button>
            </div>
        );
    }

    const basePath = `/t/${tenantSlug}/${appSlug}`;

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background">
            {/* ── Sidebar ── */}
            <div className="flex h-full w-64 flex-col border-r bg-card">
                {/* Brand */}
                <div className="flex h-14 items-center border-b px-6">
                    <div className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-primary" />
                        <span className="font-bold text-sm truncate">{tenant.name}</span>
                    </div>
                </div>

                {/* App switcher */}
                <div className="border-b px-4 py-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Aplikasi
                    </p>
                    <div className="grid gap-1">
                        {apps.map((app) => {
                            const Icon = resolveIcon(app.icon, Store);
                            const isActive = appSlug === app.slug;
                            return (
                                <Link
                                    key={app.id}
                                    to={`/t/${tenantSlug}/${app.slug}/dashboard`}
                                    className={cn(
                                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all hover:text-primary",
                                        isActive
                                            ? "bg-primary/10 text-primary font-medium"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {app.name}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Sub-navigation for active app */}
                <div className="flex-1 overflow-auto py-4">
                    <nav className="grid items-start px-4 text-sm font-medium gap-0.5">
                        {modules.length === 0 ? (
                            <div className="px-4 text-xs text-muted-foreground text-center py-4">
                                Tidak ada modul tersedia
                            </div>
                        ) : (
                            modules.map((module) => {
                                // code format: "pos.dashboard" -> path: "dashboard"
                                // If code doesn't have dot, use code as is
                                const parts = module.code.split('.');
                                const pathPart = parts.length > 1 ? parts[1] : module.code;

                                const fullPath = `${basePath}/${pathPart}`;
                                // Check if active: exact match or starts with path/ (for nested routes)
                                const isActive = location.pathname === fullPath || location.pathname.startsWith(`${fullPath}/`);
                                const Icon = resolveIcon(module.icon, Layers);

                                return (
                                    <Link
                                        key={module.id}
                                        to={fullPath}
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                                            isActive
                                                ? "bg-muted text-primary"
                                                : "text-muted-foreground"
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {module.name}
                                    </Link>
                                );
                            })
                        )}
                    </nav>
                </div>

                {/* Logout */}
                <div className="border-t p-4">
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-2 text-muted-foreground hover:text-primary"
                        onClick={signOut}
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </Button>
                </div>
            </div>

            {/* ── Main content ── */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="flex h-14 items-center justify-between border-b bg-card px-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground capitalize">{appSlug}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-sm font-medium leading-none">
                                {profile?.full_name || 'User'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {tenant.name}
                            </p>
                        </div>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                            {(profile?.full_name || 'U').charAt(0).toUpperCase()}
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
