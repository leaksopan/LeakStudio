import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';

export default function DashboardLayout() {
    const { profile, role } = useAuth();

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden pl-16 transition-all duration-300 ease-in-out">
                {/* Top bar with user info */}
                <header className="flex h-14 items-center justify-end border-b bg-card px-6">
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-sm font-medium leading-none">
                                {profile?.full_name || 'User'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {role?.name || 'No Role'}
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
