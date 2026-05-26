import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
  typescript: true,
});

export const STRIPE_PRICES = {
  starter: process.env.STRIPE_PRICE_STARTER!,
  pro: process.env.STRIPE_PRICE_PRO!,
  agency: process.env.STRIPE_PRICE_AGENCY!,
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
