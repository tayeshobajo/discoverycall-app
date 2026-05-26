import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardSidebar from '@/components/dashboard/Sidebar';
import DashboardHeader from '@/components/dashboard/Header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: host } = await supabase
    .from('hosts')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!host) {
    redirect('/onboarding');
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <DashboardSidebar host={host} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <DashboardHeader user={user} host={host} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
