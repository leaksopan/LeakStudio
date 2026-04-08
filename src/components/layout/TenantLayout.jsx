import { Outlet, Link, useLocation, useParams, Navigate } from 'react-router-dom';
import { TenantProvider, useTenant } from '../../contexts/TenantContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { cn } from '@/lib/utils.js';
import { Button } from '@/components/ui/button.jsx';
import { resolveIcon } from '@/lib/iconMap.js';
import {
    Layers, LogOut, Store, LayoutDashboard, Loader2
} from 'lucide-react';
import { useState } from 'react';

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
    const [isHovered, setIsHovered] = useState(false);

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
            <div
                className={cn(
                    "fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-card transition-all duration-300 ease-in-out",
                    isHovered ? "w-64 shadow-xl" : "w-16"
                )}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Brand */}
                <div className="flex h-14 items-center border-b px-4 overflow-hidden whitespace-nowrap">
                    <div className="flex items-center gap-3">
                        <Layers className="h-6 w-6 shrink-0 text-primary" />
                        <span className={cn(
                            "font-bold text-sm truncate transition-opacity duration-300",
                            isHovered ? "opacity-100" : "opacity-0 hidden"
                        )}>
                            {tenant.name}
                        </span>
                    </div>
                </div>

                {/* App switcher */}
                <div className="border-b px-2 py-3">
                    <p className={cn(
                        "text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2 transition-opacity duration-300",
                        isHovered ? "opacity-100" : "opacity-0 hidden"
                    )}>
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
                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:text-primary",
                                        isActive
                                            ? "bg-primary/10 text-primary font-medium"
                                            : "text-muted-foreground",
                                        !isHovered && "justify-center px-0"
                                    )}
                                    title={!isHovered ? app.name : undefined}
                                >
                                    <Icon className="h-5 w-5 shrink-0" />
                                    <span className={cn(
                                        "whitespace-nowrap transition-all duration-300",
                                        isHovered ? "opacity-100 w-auto" : "opacity-0 w-0 hidden"
                                    )}>
                                        {app.name}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Sub-navigation for active app */}
                <div className="flex-1 overflow-x-hidden overflow-y-auto py-4">
                    <nav className="grid items-start px-2 text-sm font-medium gap-1">
                        {modules.length === 0 ? (
                            <div className={cn(
                                "text-xs text-muted-foreground text-center py-4 px-2",
                                !isHovered && "hidden"
                            )}>
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
                                                : "text-muted-foreground",
                                            !isHovered && "justify-center px-0"
                                        )}
                                        title={!isHovered ? module.name : undefined}
                                    >
                                        <Icon className="h-5 w-5 shrink-0" />
                                        <span className={cn(
                                            "whitespace-nowrap transition-all duration-300",
                                            isHovered ? "opacity-100 w-auto" : "opacity-0 w-0 hidden"
                                        )}>
                                            {module.name}
                                        </span>
                                    </Link>
                                );
                            })
                        )}
                    </nav>
                </div>

                {/* Logout */}
                <div className="border-t p-2">
                    <Button
                        variant="ghost"
                        className={cn(
                            "w-full gap-3 text-muted-foreground hover:text-primary",
                            !isHovered ? "justify-center px-0" : "justify-start px-3"
                        )}
                        onClick={signOut}
                        title={!isHovered ? "Logout" : undefined}
                    >
                        <LogOut className="h-5 w-5 shrink-0" />
                        <span className={cn(
                            "whitespace-nowrap transition-all duration-300",
                            isHovered ? "opacity-100 w-auto" : "opacity-0 w-0 hidden"
                        )}>
                            Logout
                        </span>
                    </Button>
                </div>
            </div>

            {/* ── Main content ── */}
            <div className="flex flex-1 flex-col overflow-hidden pl-16 transition-all duration-300 ease-in-out">
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
