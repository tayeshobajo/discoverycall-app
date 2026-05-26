'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import type { Host } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, LogOut, User as UserIcon } from 'lucide-react';

interface HeaderProps {
  user: User;
  host: Host;
}

export default function DashboardHeader({ user, host }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const initials = (user.user_metadata?.full_name as string || user.email || 'U')
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Trial expiry banner
  const isTrialExpiring = host.trial_status === 'active' && 
    new Date(host.trial_ends_at).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;

  return (
    <div>
      {isTrialExpiring && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between">
          <p className="text-sm text-amber-800">
            Your trial ends{' '}
            <strong>
              {new Date(host.trial_ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </strong>
            . Add a payment method to keep your agents live.
          </p>
          <a href="/billing" className="text-sm font-medium text-amber-900 hover:underline">
            Upgrade now →
          </a>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative rounded-full h-8 w-8 p-0">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[#1783F1] text-white text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.user_metadata?.full_name as string || user.email}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/settings" className="cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600 focus:text-red-600">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
    </div>
  );
}
