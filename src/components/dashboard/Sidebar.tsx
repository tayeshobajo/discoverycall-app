'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Host } from '@/types/database';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Bot,
  CreditCard,
  Settings,
  Zap,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/conversations', label: 'Conversations', icon: MessageSquare },
  { href: '/visitors', label: 'Visitors', icon: Users },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/integrations', label: 'Integrations', icon: Zap },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  host: Host;
}

export default function DashboardSidebar({ host }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1783F1] rounded-lg flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm">DiscoveryCall</div>
            <div className="text-xs text-gray-400 truncate max-w-[130px]">{host.company_name}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-[#1783F1] text-white font-medium'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Plan indicator */}
      <div className="p-4 border-t border-gray-100">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700 capitalize">{host.plan} Plan</span>
            {host.trial_status === 'active' && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Trial</span>
            )}
          </div>
          {host.trial_status === 'active' && (
            <p className="text-xs text-gray-500">
              Trial ends {new Date(host.trial_ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          )}
          {host.trial_status === 'active' && (
            <Link
              href="/billing"
              className="text-xs text-[#1783F1] hover:underline font-medium mt-1 block"
            >
              Upgrade plan →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
