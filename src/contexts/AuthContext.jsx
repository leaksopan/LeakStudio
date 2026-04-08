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
        signOut,
        refreshUserData: refetch, // Expose refetch capability
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
