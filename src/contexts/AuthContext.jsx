import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
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

    // 2. Fetch User Data with React Query
    const {
        data: userData,
        isLoading: isLoadingData,
        refetch
    } = useQuery({
        queryKey: ['userData', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const controller = new AbortController();

            // A. Get profile with role
            const { data: profileData, error: profileErr } = await supabase
                .from('m_user_profiles')
                .select(`
                    *,
                    m_roles:role_id (id, name, description, is_system)
                `)
                .eq('id', user.id)
                .single()
                .abortSignal(controller.signal);

            if (profileErr) {
                // If profile missing, return null (don't throw to avoid retry loops)
                if (profileErr.code === 'PGRST116') return null;
                throw profileErr;
            }

            const role = profileData?.m_roles || null;
            const isSuperOrMaster = ['superadmin', 'master'].includes(role?.name);
            let tenant = null;
            let appAccess = [];
            let moduleAccess = [];
            let unitBisnis = [];

            // B. Get Tenant (if exists)
            if (profileData?.tenant_id) {
                const { data: tenantData } = await supabase
                    .from('m_tenants')
                    .select('id, name, slug, plan, status')
                    .eq('id', profileData.tenant_id)
                    .single()
                    .abortSignal(controller.signal);
                tenant = tenantData;
            }

            // C. Get App Access
            if (isSuperOrMaster) {
                const { data: allApps } = await supabase
                    .from('m_app_registry').select('id').eq('is_active', true).abortSignal(controller.signal);
                appAccess = allApps?.map(a => a.id) || [];
            } else {
                const { data: appData } = await supabase
                    .from('m_user_app_access').select('app_id').eq('user_id', user.id).abortSignal(controller.signal);
                appAccess = appData?.map(a => a.app_id) || [];
            }

            // D. Get Module Access
            if (isSuperOrMaster) {
                const { data: allModules } = await supabase
                    .from('m_app_modules').select('code').eq('is_active', true).abortSignal(controller.signal);
                moduleAccess = allModules?.map(m => m.code) || [];
            } else {
                const { data: modData } = await supabase
                    .from('m_user_module_access')
                    .select('m_app_modules:module_id(code)')
                    .eq('user_id', user.id)
                    .abortSignal(controller.signal);
                moduleAccess = modData?.map(m => m.m_app_modules?.code).filter(Boolean) || [];
            }

            // E. Get Unit Bisnis Access
            if (isSuperOrMaster) {
                const { data: allUB } = await supabase.from('m_unit_bisnis').select('id').abortSignal(controller.signal);
                unitBisnis = allUB?.map(u => u.id) || [];
            } else {
                const { data: ubData } = await supabase
                    .from('m_user_unit_bisnis').select('unit_bisnis_id').eq('user_id', user.id).abortSignal(controller.signal);
                unitBisnis = ubData?.map(u => u.unit_bisnis_id) || [];
            }

            return {
                profile: profileData,
                role,
                tenant,
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
