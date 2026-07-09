import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Loader2 } from 'lucide-react';

export default function AdminRoute({ children }) {
    const { isAuthenticated, loading, role, tenantSlug } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Strict Role Check: Only 'superadmin' allowed
    if (role?.name !== 'superadmin') {
        // If they are a tenant user (have tenantSlug or ID), redirect to their dashboard
        if (tenantSlug) {
            return <Navigate to={`/t/${tenantSlug}/pos/dashboard`} replace />;
        }

        // If we have profile but no tenant slug yet (maybe sync issue?), try to derive from ID? 
        // But auth context should have loaded tenant if profile.tenant_id exists.
        // If not, redirect to root/home.
        return <Navigate to="/" replace />;
    }

    return children;
}
