import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const AuthContext = createContext({});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const queryClient = useQueryClient();

    // 1. Handle Supabase Auth Session
    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoadingAuth(false);
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setUser(session?.user ?? null);
                setLoadingAuth(false);

                if (_event === 'SIGNED_OUT') {
                    // Clear all React Query cache on logout to prevent data leaks
                    queryClient.removeQueries();
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [queryClient]);

    // 2. Fetch User Data with React Query (single RPC call)
    const {
        data: userData,
        isLoading: isLoadingData,
        refetch
    } = useQuery({
        queryKey: ['userData', user?.id],
        queryFn: async () => {
            if (!user) return null;

            // Single RPC call replaces 5 sequential queries
            const { data, error } = await supabase
                .rpc('get_user_context', { p_user_id: user.id });

            if (error) {
                // If profile missing, return null (don't throw to avoid retry loops)
                if (error.code === 'PGRST116') return null;
                throw error;
            }

            if (!data) return null;

            const role = data.role || null;
            const isSuperOrMaster = ['superadmin', 'master'].includes(role?.name);

            // For superadmin/master, fetch all active apps & modules
            // (these are global lookups, not user-specific)
            let appAccess = data.app_access || [];
            let moduleAccess = (data.module_access || []).map(m => m.code).filter(Boolean);
            let unitBisnis = data.unit_bisnis_ids || [];

            if (isSuperOrMaster) {
                const [{ data: allApps }, { data: allModules }, { data: allUB }] = await Promise.all([
                    supabase.from('m_app_registry').select('id').eq('is_active', true),
                    supabase.from('m_app_modules').select('code').eq('is_active', true),
                    supabase.from('m_unit_bisnis').select('id'),
                ]);
                appAccess = allApps?.map(a => a.id) || [];
                moduleAccess = allModules?.map(m => m.code) || [];
                unitBisnis = allUB?.map(u => u.id) || [];
            }

            return {
                profile: data.profile,
                role,
                tenant: data.tenant,
                appAccess,
                moduleAccess,
                unitBisnis
            };
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000, // 5 minutes fresh
    });

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        queryClient.removeQueries();
    };

    // Derived values
    const profile = userData?.profile || null;
    const role = userData?.role || null;
    const tenant = userData?.tenant || null;
    const appAccess = userData?.appAccess || [];
    const moduleAccess = userData?.moduleAccess || [];
    const unitBisnis = userData?.unitBisnis || [];

    // Helper methods (memoized or simple functions)
    const isSuperAdmin = () => role?.name === 'superadmin';
    const isMasterOrAbove = () => ['superadmin', 'master'].includes(role?.name);

    const hasAppAccess = (appId) => {
        if (isMasterOrAbove()) return true;
        return appAccess.includes(appId);
    };

    const hasModuleAccess = (code) => {
        if (isMasterOrAbove()) return true;
        return moduleAccess.includes(code);
    };

    const hasUnitBisnis = (ubId) => {
        if (isMasterOrAbove()) return true;
        return unitBisnis.includes(ubId);
    };

    const hasInventoryAction = (action) => {
        if (isMasterOrAbove()) return true;
        const map = {
            approve: 'inventory.operations.approve',
            cancel: 'inventory.operations.cancel',
            complete: 'inventory.operations.complete',
            attach_wave: 'inventory.picking.attach',
            unpack_package: 'inventory.packages.unpack',
            process_reorder_queue: 'inventory.reorder.process',
            retry_reorder_queue: 'inventory.reorder.retry',
            export_reorder_queue: 'inventory.reorder.export',
            mark_reorder_failed: 'inventory.reorder.mark_failed',
            requeue_processed: 'inventory.reorder.requeue',
            approve_rma: 'inventory.rma.approve',
            reject_rma: 'inventory.rma.reject',
            view_rma_detail: 'inventory.rma.detail',
            create_rma: 'inventory.rma.create',
            cancel_rma: 'inventory.rma.cancel',
            export_rma: 'inventory.rma.export',
            create_serializer_rule: 'inventory.serializer.create',
            generate_serializer_code: 'inventory.serializer.generate',
            view_serializer_logs: 'inventory.serializer.logs',
            edit_serializer_rule: 'inventory.serializer.edit',
            deactivate_serializer_rule: 'inventory.serializer.deactivate',
            reactivate_serializer_rule: 'inventory.serializer.reactivate',
            generate_notification_queue: 'inventory.notification.generate',
            process_notification_queue: 'inventory.notification.process',
            export_notification_queue: 'inventory.notification.export',
        };
        const key = map[action];
        if (!key) return false;
        return moduleAccess.includes(key);
    };

    const value = {
        user,
        loading: loadingAuth || (!!user && isLoadingData),
        isAuthenticated: !!user,
        profile,
        role,
        tenant,
        tenantSlug: tenant?.slug || null,
        appAccess,
        moduleAccess,
        unitBisnis,
        isSuperAdmin,
        isMasterOrAbove,
        hasAppAccess,
        hasModuleAccess,
        hasUnitBisnis,
        hasInventoryAction,
        signOut,
        refreshUserData: refetch, // Expose refetch capability
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
