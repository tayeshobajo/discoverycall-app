'use client';

import Link from 'next/link';
import { AlertTriangle, X, XCircle } from 'lucide-react';
import { useState } from 'react';
import type { Host } from '@/types/database';

interface TrialBannerProps {
  host: Host;
}

export default function TrialBanner({ host }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  if (host.trial_status === 'converted') return null;
  if (host.trial_status === 'cancelled') return null;

  const now = Date.now();
  const trialEnd = new Date(host.trial_ends_at).getTime();
  const daysLeft = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));

  // Trial expired
  if (host.trial_status === 'expired') {
    return (
      <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-800 font-medium">
            Your trial has ended.{' '}
            <Link href="/billing" className="underline font-semibold hover:text-red-900">
              Add a payment method
            </Link>{' '}
            to keep your agent active during the grace period.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-red-400 hover:text-red-600 ml-4 flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Trial active but expiring soon (< 3 days)
  if (host.trial_status === 'active' && daysLeft <= 3 && daysLeft > 0) {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            Your trial ends in {daysLeft} day{daysLeft !== 1 ? 's' : ''}.{' '}
            <Link href="/billing" className="underline font-semibold hover:text-amber-900">
              Upgrade now
            </Link>{' '}
            to keep your agent live.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-400 hover:text-amber-600 ml-4 flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return null;
}
