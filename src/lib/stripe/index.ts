import Stripe from 'stripe';

// Lazy Stripe client — initialized only when the key is present (avoids build-time failures)
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-04-30.basil',
      typescript: true,
    });
  }
  return _stripe;
}

// Backward-compat export used in route handlers
export const stripe = {
  customers: { create: (...args: Parameters<Stripe['customers']['create']>) => getStripe().customers.create(...args) },
  checkout: { sessions: { create: (...args: Parameters<Stripe['checkout']['sessions']['create']>) => getStripe().checkout.sessions.create(...args) } },
  billingPortal: { sessions: { create: (...args: Parameters<Stripe['billingPortal']['sessions']['create']>) => getStripe().billingPortal.sessions.create(...args) } },
  webhooks: { constructEvent: (...args: Parameters<Stripe['webhooks']['constructEvent']>) => getStripe().webhooks.constructEvent(...args) },
};

export const STRIPE_PRICES = {
  starter: process.env.STRIPE_PRICE_STARTER ?? '',
  pro: process.env.STRIPE_PRICE_PRO ?? '',
  agency: process.env.STRIPE_PRICE_AGENCY ?? '',
};

export const PLAN_NAMES = {
  starter: 'Starter',
  pro: 'Pro',
  agency: 'Agency',
  enterprise: 'Enterprise',
};

export const PLAN_PRICES = {
  starter: '$99/mo',
  pro: '$249/mo',
  agency: '$499/mo',
  enterprise: 'Custom',
};
