import { supabase } from '../lib/supabase';

export const authService = {
    async signIn({ email, password }) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    },

    async signUp({ email, password, fullName, tenantName }) {
        // 1. Sign up the user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('User creation failed');

        // 2. Create Tenant (Trigger or Manual?)
        // For now, we'll assume the user is created and we handle tenant creation separately 
        // or we use a database trigger. 
        // However, best practice often involves a secondary step or a server-side function to ensure atomicity.
        // For this implementation, we will stick to basic auth first.

        return authData;
    },

    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    async getUser() {
        const { data } = await supabase.auth.getUser();
        return data.user;
    },

    async getSession() {
        const { data } = await supabase.auth.getSession();
        return data.session;
    }
};
