import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { akuntansiEnterpriseService } from '@/services/akuntansiEnterpriseService.js';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';

export default function BankReconciliationPage() {
  const { tenant } = useTenant();
  const [keyword, setKeyword] = useState('');
  const [tolerance, setTolerance] = useState('0');
  const [rules, setRules] = useState([]);

  const load = async () => {
    if (!tenant?.id) return;
    setRules(await akuntansiEnterpriseService.getBankRules(tenant.id));
  };
  useEffect(() => { load(); }, [tenant?.id]);

  const onAddRule = async () => {
    if (!tenant?.id || !keyword.trim()) return;
    await akuntansiEnterpriseService.createBankRule(tenant.id, { rule_name: `Rule ${keyword}`, keyword, amount_tolerance: Number(tolerance || 0), is_active: true });
    setKeyword(''); setTolerance('0');
    await load();
  };

  return <div className="space-y-4 rounded-lg border bg-card p-4"><h2 className="text-xl font-semibold">Bank Reconciliation</h2><div className="grid gap-3 md:grid-cols-3"><Input value={keyword} onChange={(e)=>setKeyword(e.target.value)} placeholder="Keyword mutasi"/><Input type="number" value={tolerance} onChange={(e)=>setTolerance(e.target.value)} placeholder="Tolerance"/><Button onClick={onAddRule}>Tambah Rule</Button></div>{rules.map((r)=><div key={r.id} className="rounded border px-3 py-2 text-sm">{r.rule_name} ({r.keyword}) tol {Number(r.amount_tolerance).toLocaleString('id-ID')}</div>)}</div>;
}
