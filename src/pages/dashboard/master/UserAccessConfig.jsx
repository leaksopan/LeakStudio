import { useState, useEffect, useCallback } from 'react';
import {
    userAccessService,
    appService,
    moduleService,
    unitBisnisService,
    roleService,
} from '@/services/roleService.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Label } from '@/components/ui/label.jsx';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { toast } from 'sonner';
import { Users, Loader2, Save } from 'lucide-react';

export default function UserAccessConfig() {
    const { isSuperAdmin } = useAuth();

    // Reference data
    const [users, setUsers] = useState([]);
    const [apps, setApps] = useState([]);
    const [modules, setModules] = useState([]);
    const [ubList, setUbList] = useState([]);
    const [roles, setRoles] = useState([]);

    // Selected user
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);

    // Access config for selected user
    const [assignedApps, setAssignedApps] = useState(new Set());
    const [assignedModules, setAssignedModules] = useState(new Set());
    const [assignedUB, setAssignedUB] = useState(new Set());
    const [selectedRoleId, setSelectedRoleId] = useState('');

    // UI states
    const [loading, setLoading] = useState(true);
    const [loadingAccess, setLoadingAccess] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchRefData = useCallback(async () => {
        try {
            setLoading(true);
            const [usersData, appsData, modsData, ubData, rolesData] = await Promise.all([
                userAccessService.getUsers(),
                appService.getAll(),
                moduleService.getAll(),
                unitBisnisService.getAll(),
                roleService.getAll(),
            ]);
            setUsers(usersData);
            setApps(appsData);
            setModules(modsData);
            setUbList(ubData);
            setRoles(rolesData);
        } catch (err) {
            toast.error('Failed to load data: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRefData();
    }, [fetchRefData]);

    // Load access when user is selected
    useEffect(() => {
        if (!selectedUserId) {
            setSelectedUser(null);
            setAssignedApps(new Set());
            setAssignedModules(new Set());
            setAssignedUB(new Set());
            setSelectedRoleId('');
            return;
        }

        const user = users.find(u => u.id === selectedUserId);
        setSelectedUser(user);
        setSelectedRoleId(user?.role_id || '');

        async function loadAccess() {
            setLoadingAccess(true);
            try {
                const [appIds, modIds, ubIds] = await Promise.all([
                    userAccessService.getUserAppAccess(selectedUserId),
                    userAccessService.getUserModuleAccess(selectedUserId),
                    userAccessService.getUserUnitBisnis(selectedUserId),
                ]);
                setAssignedApps(new Set(appIds));
                setAssignedModules(new Set(modIds));
                setAssignedUB(new Set(ubIds));
            } catch (err) {
                toast.error('Failed to load access: ' + err.message);
            } finally {
                setLoadingAccess(false);
            }
        }

        loadAccess();
    }, [selectedUserId, users]);

    // Toggle helpers
    function toggleApp(appId) {
        setAssignedApps(prev => {
            const next = new Set(prev);
            if (next.has(appId)) {
                next.delete(appId);
                // Also uncheck modules of this app
                const appModules = modules.filter(m => m.app_id === appId);
                const nextModules = new Set(assignedModules);
                appModules.forEach(m => nextModules.delete(m.id));
                setAssignedModules(nextModules);
            } else {
                next.add(appId);
            }
            return next;
        });
    }

    function toggleModule(moduleId) {
        setAssignedModules(prev => {
            const next = new Set(prev);
            if (next.has(moduleId)) next.delete(moduleId);
            else next.add(moduleId);
            return next;
        });
    }

    function toggleUB(ubId) {
        setAssignedUB(prev => {
            const next = new Set(prev);
            if (next.has(ubId)) next.delete(ubId);
            else next.add(ubId);
            return next;
        });
    }

    async function handleSave() {
        if (!selectedUserId) {
            toast.error('Select a user first');
            return;
        }
        setSaving(true);
        try {
            await Promise.all([
                userAccessService.syncAppAccess(selectedUserId, Array.from(assignedApps)),
                userAccessService.syncModuleAccess(selectedUserId, Array.from(assignedModules)),
                userAccessService.syncUnitBisnis(selectedUserId, Array.from(assignedUB)),
            ]);

            // Update role if changed
            if (selectedRoleId && selectedRoleId !== selectedUser?.role_id) {
                await userAccessService.updateUserRole(selectedUserId, selectedRoleId);
            }

            toast.success('User access updated successfully');
            fetchRefData(); // Refresh user list
        } catch (err) {
            toast.error('Failed to save: ' + err.message);
        } finally {
            setSaving(false);
        }
    }

    // Group modules by app
    const modulesByApp = modules.reduce((acc, m) => {
        (acc[m.app_id] = acc[m.app_id] || []).push(m);
        return acc;
    }, {});

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
                        <Users className="h-8 w-8" />
                        User Access Configuration
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Configure per-user access to apps, modules, and unit bisnis.
                    </p>
                </div>
            </div>

            {/* User & Role Selector */}
            <div className="flex flex-wrap items-end gap-4">
                <div className="w-72">
                    <Label className="mb-2 block">Select User</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Choose a user..." />
                        </SelectTrigger>
                        <SelectContent>
                            {users.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                    {u.full_name} ({u.m_roles?.name || 'no role'})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {selectedUserId && (
                    <>
                        <div className="w-48">
                            <Label className="mb-2 block">Role</Label>
                            <Select
                                value={selectedRoleId}
                                onValueChange={setSelectedRoleId}
                                disabled={!isSuperAdmin()}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select role..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map((r) => (
                                        <SelectItem key={r.id} value={r.id}>
                                            {r.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                            ) : (
                                <><Save className="h-4 w-4 mr-2" />Save Changes</>
                            )}
                        </Button>
                    </>
                )}
            </div>

            {/* Access Configuration */}
            {loadingAccess ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : !selectedUserId ? (
                <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">
                    Select a user above to configure their access.
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Column 1: Apps */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-primary">
                                App Access
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {apps.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No apps available.</p>
                            ) : (
                                apps.map((app) => (
                                    <div key={app.id} className="flex items-start gap-3">
                                        <Checkbox
                                            id={`app-${app.id}`}
                                            checked={assignedApps.has(app.id)}
                                            onCheckedChange={() => toggleApp(app.id)}
                                        />
                                        <div className="grid gap-0.5 leading-none">
                                            <Label htmlFor={`app-${app.id}`} className="text-sm font-medium cursor-pointer">
                                                {app.name}
                                            </Label>
                                            {app.description && (
                                                <p className="text-xs text-muted-foreground">{app.description}</p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Column 2: Unit Bisnis */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-primary">
                                Unit Bisnis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {ubList.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No unit bisnis available. Create one first.</p>
                            ) : (
                                ubList.map((ub) => (
                                    <div key={ub.id} className="flex items-start gap-3">
                                        <Checkbox
                                            id={`ub-${ub.id}`}
                                            checked={assignedUB.has(ub.id)}
                                            onCheckedChange={() => toggleUB(ub.id)}
                                        />
                                        <div className="grid gap-0.5 leading-none">
                                            <Label htmlFor={`ub-${ub.id}`} className="text-sm font-medium cursor-pointer">
                                                {ub.name}
                                            </Label>
                                            <p className="text-xs text-muted-foreground font-mono">
                                                {ub.code}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Column 3: Modules (grouped by app, only show apps that are checked) */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-primary">
                                Module Access
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {apps.filter(a => assignedApps.has(a.id)).length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    Select at least one app to see its modules.
                                </p>
                            ) : (
                                apps
                                    .filter(a => assignedApps.has(a.id))
                                    .map((app) => (
                                        <div key={app.id}>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                                                {app.name}
                                            </p>
                                            <div className="space-y-2 ml-1">
                                                {(modulesByApp[app.id] || []).map((mod) => (
                                                    <div key={mod.id} className="flex items-start gap-3">
                                                        <Checkbox
                                                            id={`mod-${mod.id}`}
                                                            checked={assignedModules.has(mod.id)}
                                                            onCheckedChange={() => toggleModule(mod.id)}
                                                        />
                                                        <div className="grid gap-0.5 leading-none">
                                                            <Label htmlFor={`mod-${mod.id}`} className="text-sm font-medium cursor-pointer">
                                                                {mod.name}
                                                            </Label>
                                                            <p className="text-xs text-muted-foreground font-mono">
                                                                {mod.code}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!modulesByApp[app.id] || modulesByApp[app.id].length === 0) && (
                                                    <p className="text-xs text-muted-foreground">No modules for this app.</p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
