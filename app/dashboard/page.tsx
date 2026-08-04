import { createClient } from '@/lib/supabase/server';
import VeloxisApp from './VeloxisApp';
import { Vehicle } from '@/lib/veloxis';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <VeloxisApp initialVehicles={(vehicles || []) as Vehicle[]} userEmail={user?.email || ''} />
  );
}
