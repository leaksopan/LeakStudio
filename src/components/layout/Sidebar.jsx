import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { cn } from '@/lib/utils.js';
import { Button } from '@/components/ui/button.jsx';
import {
    LayoutDashboard,
    Users,
    Settings,
    LogOut,
    Layers,
    Shield,
    Blocks,
    UserCog,
    ChevronRight,
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
    const [isHovered, setIsHovered] = useState(false);

    // Auto-expand master data if active, but we'll use a popover or just expand in the rail if hovered
    const isMasterActive = location.pathname.startsWith('/dashboard/master');
    const [masterOpen, setMasterOpen] = useState(isMasterActive);

    const handleLogout = async () => {
        await signOut();
    };

    return (
        <div
            className={cn(
                "fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-card transition-all duration-300 ease-in-out",
                isHovered ? "w-64 shadow-xl" : "w-16"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Logo Area */}
            <div className="flex h-14 items-center border-b px-4 overflow-hidden whitespace-nowrap">
                <Link to="/dashboard" className="flex items-center gap-3 font-bold text-primary">
                    <Layers className="h-6 w-6 shrink-0" />
                    <span className={cn(
                        "transition-opacity duration-300",
                        isHovered ? "opacity-100" : "opacity-0 hidden"
                    )}>
                        LeakStudio
                    </span>
                </Link>
            </div>

            {/* Nav Items */}
            <div className="flex-1 overflow-x-hidden overflow-y-auto py-4">
                <nav className="grid gap-1 px-2 text-sm font-medium">
                    {mainItems.map((item, index) => (
                        <Link
                            key={index}
                            to={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-accent hover:text-accent-foreground",
                                location.pathname === item.href
                                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                                    : "text-muted-foreground",
                                !isHovered && "justify-center px-0"
                            )}
                            title={!isHovered ? item.title : undefined}
                        >
                            <item.icon className="h-5 w-5 shrink-0" />
                            <span className={cn(
                                "whitespace-nowrap transition-all duration-300",
                                isHovered ? "opacity-100 w-auto" : "opacity-0 w-0 hidden"
                            )}>
                                {item.title}
                            </span>
                        </Link>
                    ))}

                    {/* Master Data Group */}
                    <div className="mt-4">
                        <button
                            onClick={() => isHovered && setMasterOpen(!masterOpen)}
                            className={cn(
                                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground",
                                !isHovered && "justify-center px-0"
                            )}
                            title={!isHovered ? "Master Data" : undefined}
                        >
                            <Database className="h-5 w-5 shrink-0" />
                            <span className={cn(
                                "flex-1 text-left whitespace-nowrap transition-all duration-300",
                                isHovered ? "opacity-100" : "opacity-0 hidden"
                            )}>
                                Master Data
                            </span>
                            {isHovered && (
                                <ChevronRight
                                    className={cn(
                                        "h-4 w-4 transition-transform",
                                        masterOpen && "rotate-90"
                                    )}
                                />
                            )}
                        </button>

                        {/* Nested Items - Only show if hovered and open */}
                        <div className={cn(
                            "grid gap-1 overflow-hidden transition-all duration-300",
                            (masterOpen && isHovered) ? "mt-1 max-h-40 opacity-100" : "max-h-0 opacity-0"
                        )}>
                            {masterDataItems.map((item, index) => (
                                <Link
                                    key={index}
                                    to={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg py-2 pl-9 pr-3 transition-all hover:text-primary",
                                        location.pathname === item.href
                                            ? "text-primary"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    <item.icon className="h-4 w-4 shrink-0" />
                                    <span className="whitespace-nowrap">{item.title}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </nav>
            </div>

            {/* Footer / Logout */}
            <div className="border-t p-2">
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full gap-3 text-muted-foreground hover:text-primary",
                        !isHovered ? "justify-center px-0" : "justify-start px-3"
                    )}
                    onClick={handleLogout}
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
    );
}
