import { useParams } from 'react-router-dom';
import POSDashboard from '@/pages/apps/pos/dashboard/index.jsx';
import AkuntansiDashboard from '@/pages/apps/akuntansi/dashboard/index.jsx';

export default function AppDashboardRouter() {
  const { appSlug } = useParams();

  if (appSlug === 'akuntansi') return <AkuntansiDashboard />;
  return <POSDashboard />;
}
