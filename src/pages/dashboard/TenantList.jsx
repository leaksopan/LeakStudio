import { useEffect, useState } from 'react';
import { tenantService } from '../../services/tenantService';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, Eye, Store, Camera, ListOrdered } from 'lucide-react';
import { toast } from 'sonner';

const APP_ICONS = {
    pos: Store,
    photostudio: Camera,
    antrian: ListOrdered,
};

export default function TenantList() {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);

    useEffect(() => { loadTenants(); }, []);

    async function loadTenants() {
        try {
            const data = await tenantService.getTenants();
            setTenants(data);
        } catch (error) {
            console.error(error);
            toast.error('Gagal memuat data tenant');
        } finally {
            setLoading(false);
        }
    }

    function handleCreated() {
        setDialogOpen(false);
        loadTenants();
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Tambah Tenant
                        </Button>
                    </DialogTrigger>
                    <AddTenantDialog onSuccess={handleCreated} />
                </Dialog>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama</TableHead>
                            <TableHead>Slug</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Aplikasi</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Dibuat</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10">
                                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : tenants.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                    Belum ada tenant.
                                </TableCell>
                            </TableRow>
                        ) : (
                            tenants.map((tenant) => (
                                <TableRow key={tenant.id}>
                                    <TableCell className="font-medium">{tenant.name}</TableCell>
                                    <TableCell className="text-muted-foreground font-mono text-xs">{tenant.slug}</TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary capitalize">
                                            {tenant.plan}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1.5">
                                            {tenant.m_tenant_apps?.map((ta) => {
                                                const app = ta.m_app_registry;
                                                if (!app) return null;
                                                const Icon = APP_ICONS[app.slug] || Store;
                                                return (
                                                    <span
                                                        key={app.id}
                                                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-muted text-muted-foreground"
                                                        title={app.name}
                                                    >
                                                        <Icon className="h-3 w-3" />
                                                        {app.name}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tenant.status === 'active'
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                            }`}>
                                            {tenant.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-xs">
                                        {new Date(tenant.created_at).toLocaleDateString('id-ID')}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

/* ─────────────── Add Tenant Dialog ─────────────── */

function AddTenantDialog({ onSuccess }) {
    const [apps, setApps] = useState([]);
    const [saving, setSaving] = useState(false);
    const [selectedApps, setSelectedApps] = useState([]);
    const [form, setForm] = useState({
        tenantName: '',
        tenantSlug: '',
        plan: 'basic',
        fullName: '',
        email: '',
        password: '',
    });

    useEffect(() => {
        tenantService.getApps().then(setApps).catch(console.error);
    }, []);

    function handleNameChange(name) {
        const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
        setForm((f) => ({ ...f, tenantName: name, tenantSlug: slug }));
    }

    function toggleApp(appId) {
        setSelectedApps((prev) =>
            prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
        );
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!form.tenantName || !form.email || !form.password || !form.fullName) {
            toast.error('Semua field wajib diisi');
            return;
        }
        if (form.password.length < 6) {
            toast.error('Password minimal 6 karakter');
            return;
        }
        if (selectedApps.length === 0) {
            toast.error('Pilih minimal 1 aplikasi');
            return;
        }

        setSaving(true);
        try {
            await tenantService.onboardTenant({
                ...form,
                appIds: selectedApps,
            });
            toast.success('Tenant berhasil dibuat!');
            onSuccess?.();
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Gagal membuat tenant');
        } finally {
            setSaving(false);
        }
    }

    return (
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>Tambah Tenant Baru</DialogTitle>
                <DialogDescription>
                    Buat tenant beserta akun Master (pemilik) dan default unit bisnis.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* ── Tenant Info ── */}
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Informasi Tenant
                    </h4>
                    <div className="grid gap-3">
                        <div className="grid gap-1.5">
                            <Label htmlFor="tenantName">Nama Tenant</Label>
                            <Input
                                id="tenantName"
                                placeholder="Toko Sinar Jaya"
                                value={form.tenantName}
                                onChange={(e) => handleNameChange(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="tenantSlug">Slug (URL)</Label>
                            <Input
                                id="tenantSlug"
                                placeholder="toko-sinar-jaya"
                                value={form.tenantSlug}
                                onChange={(e) => setForm((f) => ({ ...f, tenantSlug: e.target.value }))}
                                className="font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                                URL: /t/<strong>{form.tenantSlug || '...'}</strong>/pos/dashboard
                            </p>
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="plan">Plan</Label>
                            <Select
                                value={form.plan}
                                onValueChange={(v) => setForm((f) => ({ ...f, plan: v }))}
                            >
                                <SelectTrigger id="plan">
                                    <SelectValue placeholder="Pilih plan" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="basic">Basic</SelectItem>
                                    <SelectItem value="pro">Pro</SelectItem>
                                    <SelectItem value="enterprise">Enterprise</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* ── Master Account ── */}
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Akun Master (Pemilik)
                    </h4>
                    <div className="grid gap-3">
                        <div className="grid gap-1.5">
                            <Label htmlFor="fullName">Nama Lengkap</Label>
                            <Input
                                id="fullName"
                                placeholder="Budi Santoso"
                                value={form.fullName}
                                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="budi@sinartoko.com"
                                value={form.email}
                                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Minimal 6 karakter"
                                value={form.password}
                                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                            />
                        </div>
                    </div>
                </div>

                {/* ── App Selection ── */}
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Aplikasi
                    </h4>
                    <div className="grid gap-2">
                        {apps.map((app) => {
                            const Icon = APP_ICONS[app.slug] || Store;
                            return (
                                <label
                                    key={app.id}
                                    className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                                >
                                    <Checkbox
                                        checked={selectedApps.includes(app.id)}
                                        onCheckedChange={() => toggleApp(app.id)}
                                    />
                                    <Icon className="h-4 w-4 text-primary" />
                                    <div>
                                        <p className="text-sm font-medium">{app.name}</p>
                                        {app.description && (
                                            <p className="text-xs text-muted-foreground">{app.description}</p>
                                        )}
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                </div>

                <DialogFooter>
                    <Button type="submit" disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Membuat...
                            </>
                        ) : (
                            'Buat Tenant'
                        )}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
