import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';
import type Stripe from 'stripe';
import type { PlanTier } from '@/types/database';

// Map Stripe price IDs to plan tiers
function getPlanFromPriceId(priceId: string): PlanTier {
  const map: Record<string, PlanTier> = {
    [process.env.STRIPE_PRICE_STARTER!]: 'starter',
    [process.env.STRIPE_PRICE_PRO!]: 'pro',
    [process.env.STRIPE_PRICE_AGENCY!]: 'agency',
  };
  return map[priceId] ?? 'starter';
}

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = await createServiceClient();

  // Idempotency: check if we've already processed this event
  const { data: existingEvent } = await supabase
    .from('events')
    .select('id')
    .eq('event_type', `stripe_webhook_${event.type}`)
    .contains('event_data', { stripe_event_id: event.id })
    .maybeSingle();

  if (existingEvent) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const hostId = session.metadata?.host_id;
        const plan = (session.metadata?.plan as PlanTier) ?? 'starter';

        if (!hostId) break;

        await supabase.from('hosts').update({
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          trial_status: 'converted',
          plan,
        }).eq('id', hostId);

        await supabase.from('events').insert({
          host_id: hostId,
          event_type: 'stripe_webhook_checkout.session.completed',
          event_data: {
            stripe_event_id: event.id,
            plan,
            subscription_id: session.subscription,
          },
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const hostId = subscription.metadata?.host_id;

        if (!hostId) break;

        const priceId = subscription.items.data[0]?.price.id;
        const newPlan = getPlanFromPriceId(priceId);

        // Get current host to check for downgrade
        const { data: host } = await supabase
          .from('hosts')
          .select('plan, id')
          .eq('id', hostId)
          .maybeSingle();

        if (!host) break;

        // Update plan
        await supabase.from('hosts').update({ plan: newPlan }).eq('id', hostId);

        // Downgrade handling: pause over-limit agents
        if (host) {
          const { data: planLimits } = await supabase
            .from('plan_limits')
            .select('max_agents')
            .eq('plan', newPlan)
            .maybeSingle();

          const maxAgents = planLimits?.max_agents ?? 1;

          const { data: activeAgents } = await supabase
            .from('agents')
            .select('id, created_at')
            .eq('host_id', hostId)
            .neq('status', 'paused')
            .order('created_at', { ascending: false });

          if (activeAgents && activeAgents.length > maxAgents) {
            const agentsToPause = activeAgents.slice(maxAgents);
            for (const agent of agentsToPause) {
              await supabase.from('agents').update({ status: 'paused' }).eq('id', agent.id);
            }

            // Log downgrade event
            await supabase.from('events').insert({
              host_id: hostId,
              event_type: 'plan_downgrade_agents_paused',
              event_data: {
                stripe_event_id: event.id,
                old_plan: host.plan,
                new_plan: newPlan,
                agents_paused: agentsToPause.map(a => a.id),
              },
            });
          }
        }

        await supabase.from('events').insert({
          host_id: hostId,
          event_type: 'stripe_webhook_customer.subscription.updated',
          event_data: {
            stripe_event_id: event.id,
            new_plan: newPlan,
            subscription_id: subscription.id,
          },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const hostId = subscription.metadata?.host_id;

        if (!hostId) break;

        await supabase.from('hosts').update({
          trial_status: 'cancelled',
          stripe_subscription_id: null,
        }).eq('id', hostId);

        await supabase.from('events').insert({
          host_id: hostId,
          event_type: 'stripe_webhook_customer.subscription.deleted',
          event_data: { stripe_event_id: event.id },
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: host } = await supabase
          .from('hosts')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (!host) break;

        await supabase.from('events').insert({
          host_id: host.id,
          event_type: 'stripe_webhook_invoice.payment_failed',
          event_data: {
            stripe_event_id: event.id,
            invoice_id: invoice.id,
            amount_due: invoice.amount_due,
          },
        });

        // TODO: Send payment failure email via Resend (Sprint 4)
        break;
      }
    }
  } catch (err) {
    console.error(`Error processing webhook ${event.type}:`, err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
