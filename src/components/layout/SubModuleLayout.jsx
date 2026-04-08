import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area.jsx';

export default function SubModuleLayout({ title, description, items, children, action }) {
    const location = useLocation();

    return (
        <div className="flex h-full w-full flex-col">
            {/* Header */}
            <div className="flex h-14 items-center justify-between border-b px-6 bg-card/50 backdrop-blur">
                <div>
                    <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
                    {description && <p className="text-xs text-muted-foreground">{description}</p>}
                </div>
                {action && (
                    <div>
                        {action}
                    </div>
                )}
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Inner Sidebar */}
                <aside className="w-56 border-r bg-card/30 hidden md:block">
                    <ScrollArea className="h-full py-4">
                        <div className="px-3 space-y-1">
                            {items.map((item) => (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                        location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
                                            ? "bg-accent text-accent-foreground"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    {item.icon && <item.icon className="h-4 w-4" />}
                                    {item.title}
                                </Link>
                            ))}
                        </div>
                    </ScrollArea>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
