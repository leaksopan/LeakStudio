import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { authService } from '../../services/authService.js';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { toast } from 'sonner';

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, loading: authLoading, role, profile, tenantSlug } = useAuth();
    const [loading, setLoading] = useState(false);

    // Redirect based on role after authentication
    useEffect(() => {
        if (authLoading || !isAuthenticated || !role) return;

        const from = location.state?.from?.pathname;
        if (from) {
            navigate(from, { replace: true });
            return;
        }

        // SuperAdmin → admin dashboard (no tenant)
        if (role.name === 'superadmin') {
            navigate('/dashboard', { replace: true });
            return;
        }

        // Tenant users — wait until tenantSlug is resolved
        if (profile?.tenant_id && !tenantSlug) return; // still loading tenant

        if (tenantSlug) {
            navigate(`/t/${tenantSlug}/pos/dashboard`, { replace: true });
        } else {
            // No tenant assigned — fallback
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, authLoading, role, profile, tenantSlug, navigate, location]);

    const form = useForm({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    async function onSubmit(values) {
        setLoading(true);
        try {
            await authService.signIn(values);
            toast.success('Successfully logged in!');
            // Navigation is handled by useEffect above when isAuthenticated changes
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex h-screen w-full items-center justify-center bg-muted/40 px-4">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-2xl">Login</CardTitle>
                    <CardDescription>
                        Enter your email below to login to your account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="m@example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="******" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Logging in...' : 'Sign in'}
                            </Button>
                        </form>
                    </Form>
                    <div className="mt-4 text-center text-sm">
                        Don&apos;t have an account?{' '}
                        <Link to="/register" className="underline text-primary hover:text-primary/80">
                            Sign up
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
