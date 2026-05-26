import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, STRIPE_PRICES } from '@/lib/stripe';
import type { PlanTier } from '@/types/database';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan } = await request.json() as { plan: PlanTier };

    if (!['starter', 'pro', 'agency'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const priceId = STRIPE_PRICES[plan as keyof typeof STRIPE_PRICES];
    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured' }, { status: 500 });
    }

    const { data: host } = await supabase
      .from('hosts')
      .select('id, stripe_customer_id, company_name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!host) {
      return NextResponse.json({ error: 'Host not found' }, { status: 404 });
    }

    // Create or retrieve Stripe customer
    let customerId = host.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        name: host.company_name,
        metadata: {
          host_id: host.id,
          user_id: user.id,
        },
      });
      customerId = customer.id;

      await supabase
        .from('hosts')
        .update({ stripe_customer_id: customerId })
        .eq('id', host.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?cancelled=1`,
      metadata: {
        host_id: host.id,
        plan,
      },
      subscription_data: {
        metadata: {
          host_id: host.id,
          plan,
        },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
