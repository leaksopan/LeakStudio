import { createContext, useContext, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tenantService } from '../services/tenantService.js';
import { useAuth } from './AuthContext.jsx';

const TenantContext = createContext(null);

export function useTenant() {
    const ctx = useContext(TenantContext);
    if (!ctx) throw new Error('useTenant must be used within TenantProvider');
    return ctx;
}

export function TenantProvider({ children }) {
    const { tenantSlug, appSlug } = useParams();
    const { user, role, profile, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    // 1. Fetch Tenant Data
    const {
        data: tenant,
        isLoading: tenantLoading,
        error: tenantError,
        refetch: refetchTenant
    } = useQuery({
        queryKey: ['tenant', tenantSlug],
        queryFn: async () => {
            const data = await tenantService.getTenantBySlug(tenantSlug);
            return data;
        },
        enabled: !!tenantSlug,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: false,
    });

    // 2. Security Check (IDOR Prevention)
    useEffect(() => {
        // Only check when everything is loaded
        if (authLoading || tenantLoading) return;

        // If we have profile and tenant, check match
        if (profile && tenant) {
            const isSuperAdmin = role?.name === 'superadmin';

            if (!isSuperAdmin) {
                if (profile.tenant_id !== tenant.id) {
                    console.error('Unauthorized Access: You do not belong to this tenant.');
                    // Unauthorized
                    navigate('/', { replace: true });
                }
            }
        }
    }, [authLoading, tenantLoading, tenant, profile, role, navigate]);

    // 3. Extract Enabled Apps
    const apps = tenant?.m_tenant_apps
        ?.filter((ta) => ta.enabled)
        .map((ta) => ta.m_app_registry)
        .filter(Boolean) || [];

    const currentApp = apps.find(a => a.slug === appSlug);

    // 4. Fetch Modules for Current App
    const {
        data: modules = [],
        isLoading: modulesLoading,
        refetch: refetchModules
    } = useQuery({
        queryKey: ['modules', currentApp?.id],
        queryFn: async () => {
            if (!currentApp) return [];
            const mods = await tenantService.getModulesByAppId(currentApp.id);
            return mods;
        },
        enabled: !!currentApp?.id,
        staleTime: 5 * 60 * 1000,
    });

    const reload = () => {
        refetchTenant();
        refetchModules();
    };

    const value = {
        tenant,
        tenantSlug,
        apps,
        modules,
        loading: tenantLoading || modulesLoading, // Combine loading states if crucial
        // Note: We might want to allow rendering skeleton while loading
        error: tenantError ? (tenantError.message || 'Tenant not found') : null,
        reload,
    };

    return (
        <TenantContext.Provider value={value}>
            {children}
        </TenantContext.Provider>
    );
}
