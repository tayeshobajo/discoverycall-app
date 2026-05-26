'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard, Zap, Building2, Users } from 'lucide-react';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$99',
    period: '/month',
    description: 'For solo consultants validating the channel.',
    features: [
      '1 AI discovery agent',
      '200 conversations/month',
      'Email reports',
      'Dashboard + conversation history',
      'Google Docs playbook',
      'All embed integrations',
    ],
    cta: 'Start Starter',
    icon: Zap,
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$249',
    period: '/month',
    description: 'For growing practices with multiple pages/offerings.',
    features: [
      '3 AI discovery agents',
      'Unlimited conversations',
      'Everything in Starter',
      'White-label branding',
      'Priority support',
    ],
    cta: 'Start Pro',
    icon: Building2,
    highlight: true,
  },
  {
    id: 'agency',
    name: 'Agency',
    price: '$499',
    period: '/month',
    description: 'For agencies running discovery for multiple clients.',
    features: [
      '10 AI discovery agents',
      'Unlimited conversations',
      'Everything in Pro',
      '3 team seats',
    ],
    cta: 'Start Agency',
    icon: Users,
    highlight: false,
  },
];

export default function BillingPage() {
  const [host, setHost] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchHost = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data } = await supabase
        .from('hosts')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setHost(data);
    };
    fetchHost();
  }, []);

  const handleCheckout = async (planId: string) => {
    setCheckoutLoading(planId);
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: planId }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
    setCheckoutLoading(null);
  };

  const handlePortal = async () => {
    setLoading(true);
    const res = await fetch('/api/stripe/portal', { method: 'POST' });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
    setLoading(false);
  };

  const daysLeft = host ? Math.max(0, Math.ceil(
    (new Date(host.trial_ends_at as string).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )) : null;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your plan and payment details.</p>
      </div>

      {/* Current plan */}
      {host && (
        <Card>
          <CardHeader>
            <CardTitle>Current plan</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold capitalize">{host.plan as string} Plan</span>
                {host.trial_status === 'active' && (
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                    Trial — {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                  </Badge>
                )}
                {host.trial_status === 'converted' && (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {host.trial_status === 'active'
                  ? 'No card required for trial. Upgrade anytime.'
                  : host.stripe_subscription_id
                  ? 'Managed via Stripe'
                  : 'No active subscription'}
              </p>
            </div>
            {host.stripe_customer_id && (
              <Button variant="outline" onClick={handlePortal} disabled={loading}>
                <CreditCard className="w-4 h-4 mr-2" />
                {loading ? 'Loading...' : 'Manage billing'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plan comparison */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = host?.plan === plan.id && host?.trial_status === 'converted';
            return (
              <Card key={plan.id} className={plan.highlight ? 'border-[#1783F1] ring-1 ring-[#1783F1]' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Icon className="w-4 h-4 text-blue-600" />
                    </div>
                    {plan.highlight && (
                      <span className="text-xs bg-[#1783F1] text-white px-2 py-0.5 rounded-full font-medium">
                        Most popular
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-gray-400 text-sm">{plan.period}</span>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current plan
                    </Button>
                  ) : (
                    <Button
                      className={`w-full ${plan.highlight ? 'bg-[#1783F1] hover:bg-[#1468C8]' : ''}`}
                      variant={plan.highlight ? 'default' : 'outline'}
                      onClick={() => handleCheckout(plan.id)}
                      disabled={checkoutLoading === plan.id}
                    >
                      {checkoutLoading === plan.id ? 'Redirecting...' : plan.cta}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
