import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard,
    Users,
    Settings,
    LogOut,
    Layers,
    Shield,
    Blocks,
    UserCog,
    ChevronDown,
    Database,
} from 'lucide-react';
import { useState } from 'react';

const mainItems = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
    },
    {
        title: 'Tenants',
        href: '/dashboard/tenants',
        icon: Users,
    },
    {
        title: 'Settings',
        href: '/dashboard/settings',
        icon: Settings,
    },
];

const masterDataItems = [
    {
        title: 'Roles',
        href: '/dashboard/master/roles',
        icon: Shield,
    },
    {
        title: 'App Modules',
        href: '/dashboard/master/modules',
        icon: Blocks,
    },
    {
        title: 'User Access',
        href: '/dashboard/master/user-access',
        icon: UserCog,
    },
];

export function Sidebar() {
    const location = useLocation();
    const { signOut } = useAuth();
    const [masterOpen, setMasterOpen] = useState(
        location.pathname.startsWith('/dashboard/master')
    );

    const handleLogout = async () => {
        await signOut();
    };

    return (
        <div className="flex h-full w-64 flex-col border-r bg-card">
            <div className="flex h-14 items-center border-b px-6">
                <Link to="/dashboard" className="flex items-center gap-2 font-bold">
                    <Layers className="h-6 w-6 text-primary" />
                    <span>LeakStudio</span>
                </Link>
            </div>
            <div className="flex-1 overflow-auto py-4">
                <nav className="grid items-start px-4 text-sm font-medium">
                    {mainItems.map((item, index) => (
                        <Link
                            key={index}
                            to={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                                location.pathname === item.href
                                    ? "bg-muted text-primary"
                                    : "text-muted-foreground"
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.title}
                        </Link>
                    ))}

                    {/* Master Data Group */}
                    <div className="mt-4">
                        <button
                            onClick={() => setMasterOpen(!masterOpen)}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                        >
                            <Database className="h-4 w-4" />
                            <span className="flex-1 text-left">Master Data</span>
                            <ChevronDown
                                className={cn(
                                    "h-4 w-4 transition-transform",
                                    masterOpen && "rotate-180"
                                )}
                            />
                        </button>
                        {masterOpen && (
                            <div className="ml-4 mt-1 grid gap-0.5">
                                {masterDataItems.map((item, index) => (
                                    <Link
                                        key={index}
                                        to={item.href}
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                                            location.pathname === item.href
                                                ? "bg-muted text-primary"
                                                : "text-muted-foreground"
                                        )}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        {item.title}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </nav>
            </div>
            <div className="border-t p-4">
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-muted-foreground hover:text-primary"
                    onClick={handleLogout}
                >
                    <LogOut className="h-4 w-4" />
                    Logout
                </Button>
            </div>
        </div>
    );
}
