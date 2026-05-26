import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings } from 'lucide-react';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: host } = await supabase
    .from('hosts')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!host) redirect('/onboarding');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-700">Email</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-700">Company</p>
              <p className="text-sm text-gray-500">{host.company_name}</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-700">Plan</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 capitalize">{host.plan}</span>
                {host.trial_status === 'active' && (
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs">Trial</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Member since</p>
              <p className="text-sm text-gray-500">
                {new Date(host.created_at).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>More settings</CardTitle>
          <CardDescription>Additional preferences coming in Sprint 4</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Password change, notification preferences, timezone, and account deletion
            will be available in the next update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
