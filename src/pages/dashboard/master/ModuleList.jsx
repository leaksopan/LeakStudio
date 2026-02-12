import { useState, useEffect, useCallback } from 'react';
import { moduleService, appService } from '@/services/roleService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Blocks, Loader2 } from 'lucide-react';

export default function ModuleList() {
    const [modules, setModules] = useState([]);
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({
        app_id: '',
        code: '',
        name: '',
        description: '',
    });
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [modsData, appsData] = await Promise.all([
                moduleService.getAll(),
                appService.getAll(),
            ]);
            setModules(modsData);
            setApps(appsData);
        } catch (err) {
            toast.error('Failed to load data: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    function openCreate() {
        setEditing(null);
        setForm({ app_id: apps[0]?.id || '', code: '', name: '', description: '' });
        setDialogOpen(true);
    }

    function openEdit(mod) {
        setEditing(mod);
        setForm({
            app_id: mod.app_id,
            code: mod.code,
            name: mod.name,
            description: mod.description || '',
        });
        setDialogOpen(true);
    }

    async function handleSave() {
        if (!form.code.trim() || !form.name.trim() || !form.app_id) {
            toast.error('App, code, and name are required');
            return;
        }
        setSaving(true);
        try {
            if (editing) {
                await moduleService.update(editing.id, form);
                toast.success('Module updated');
            } else {
                await moduleService.create(form);
                toast.success('Module created');
            }
            setDialogOpen(false);
            fetchData();
        } catch (err) {
            toast.error('Failed to save: ' + err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(mod) {
        if (!confirm(`Delete module "${mod.code}"?`)) return;
        try {
            await moduleService.delete(mod.id);
            toast.success('Module deleted');
            fetchData();
        } catch (err) {
            toast.error('Failed to delete: ' + err.message);
        }
    }

    // Group by app
    const grouped = modules.reduce((acc, m) => {
        const appName = m.m_app_registry?.name || 'Unknown';
        (acc[appName] = acc[appName] || []).push(m);
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
                        <Blocks className="h-8 w-8" />
                        App Modules
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage modules for each application.
                    </p>
                </div>
                <Button onClick={openCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Module
                </Button>
            </div>

            <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>App</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                </TableCell>
                            </TableRow>
                        ) : modules.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    No modules found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            Object.entries(grouped).map(([appName, mods]) =>
                                mods.map((mod, idx) => (
                                    <TableRow key={mod.id}>
                                        <TableCell>
                                            {idx === 0 ? (
                                                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                                                    {appName}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">{appName}</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">{mod.code}</TableCell>
                                        <TableCell className="font-medium">{mod.name}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {mod.description || '—'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(mod)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(mod)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Create / Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Module' : 'Create Module'}</DialogTitle>
                        <DialogDescription>
                            {editing ? 'Update the module details.' : 'Add a new module to an application.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="app">Application</Label>
                            <Select
                                value={form.app_id}
                                onValueChange={(val) => setForm({ ...form, app_id: val })}
                                disabled={!!editing}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select app..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {apps.map((app) => (
                                        <SelectItem key={app.id} value={app.id}>
                                            {app.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="code">Code</Label>
                            <Input
                                id="code"
                                placeholder="e.g. pos.kasir"
                                value={form.code}
                                onChange={(e) => setForm({ ...form, code: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Kasir"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                placeholder="Brief description"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
