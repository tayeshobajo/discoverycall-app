/**
 * GET /api/widget/config/[token]
 *
 * Returns agent configuration for widget initialization.
 * Called by the embed loader before the widget opens.
 * Rate limited 60/min per token.
 *
 * Response shape drives the widget's appearance (persona name, welcome message, colors).
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { rateLimiters } from '@/lib/rate-limit';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface WidgetConfig {
  enabled: boolean;
  agentId: string;
  displayName: string;
  themeColor: string;
  themeColorAccent: string | null;
  logoUrl: string | null;
  avatarUrl: string | null;
  buttonPosition: string;
  buttonShape: string;
  buttonSize: string;
  buttonIconUrl: string | null;
  pulseAnimation: boolean;
  greetingTitle: string;
  greetingMessage: string | null;
  showBranding: boolean;
  ctaType: string;
  calendarUrl: string | null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<Response> {
  const { token } = await params;

  if (!token || token.length !== 64) {
    return Response.json({ error: 'Invalid token' }, { status: 400 });
  }

  // Rate limit: 60/min per token
  const rl = await rateLimiters.widgetConfig(token);
  if (!rl.success) {
    return Response.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)),
        },
      }
    );
  }

  // Fetch agent + config
  const { data, error } = await supabase
    .from('agents')
    .select(`
      id,
      display_name,
      status,
      host_id,
      agent_config (
        theme_color,
        theme_color_accent,
        logo_url,
        agent_avatar_url,
        button_position,
        button_shape,
        button_size,
        button_icon_url,
        pulse_animation,
        greeting_title,
        greeting_message,
        show_discoverycall_branding,
        cta_type,
        calendar_url,
        hours_of_operation
      ),
      hosts (
        trial_status,
        stripe_subscription_id,
        plan
      )
    `)
    .eq('embed_token', token)
    .single();

  if (error || !data) {
    // Don't leak whether token exists — return disabled config
    return Response.json({ enabled: false }, {
      headers: corsHeaders(),
    });
  }

  const agent = data as typeof data & {
    agent_config: Database['public']['Tables']['agent_config']['Row'] | null;
    hosts: Pick<Database['public']['Tables']['hosts']['Row'], 'trial_status' | 'stripe_subscription_id' | 'plan'>;
  };

  // Check if agent should be enabled
  const hostExpired =
    (agent.hosts.trial_status === 'expired' || agent.hosts.trial_status === 'cancelled') &&
    !agent.hosts.stripe_subscription_id;

  const enabled = agent.status === 'ready' && !hostExpired;

  if (!enabled) {
    return Response.json({ enabled: false }, {
      headers: corsHeaders(),
    });
  }

  const config = agent.agent_config;

  const widgetConfig: WidgetConfig = {
    enabled: true,
    agentId: agent.id,
    displayName: agent.display_name,
    themeColor: config?.theme_color ?? '#1783F1',
    themeColorAccent: config?.theme_color_accent ?? null,
    logoUrl: config?.logo_url ?? null,
    avatarUrl: config?.agent_avatar_url ?? null,
    buttonPosition: config?.button_position ?? 'bottom-right',
    buttonShape: config?.button_shape ?? 'circle',
    buttonSize: config?.button_size ?? 'medium',
    buttonIconUrl: config?.button_icon_url ?? null,
    pulseAnimation: config?.pulse_animation ?? true,
    greetingTitle: config?.greeting_title ?? "Let's talk",
    greetingMessage: config?.greeting_message ?? null,
    showBranding: config?.show_discoverycall_branding ?? true,
    ctaType: config?.cta_type ?? 'book_call',
    calendarUrl: config?.calendar_url ?? null,
  };

  // Cache for 5 minutes at CDN layer
  return Response.json(widgetConfig, {
    headers: {
      ...corsHeaders(),
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
