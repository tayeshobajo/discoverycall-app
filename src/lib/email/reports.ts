/**
 * Email Report System — DiscoveryCall
 *
 * Sends 3 report types via Resend:
 *   - hot_lead: intent >= 70 AND email captured
 *   - completed: conversation ended (idle/close/timeout)
 *   - long_conversation: 30+ minutes or 50+ messages
 *
 * All reports are idempotent via the events table.
 * From: reports@discoverycall.ai
 */

import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const resend = new Resend(process.env.RESEND_API_KEY!);

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ReportType = 'hot_lead' | 'completed' | 'long_conversation';

interface ConversationFull {
  id: string;
  agent_id: string;
  host_id: string;
  visitor_id: string;
  source_page_url: string | null;
  intent_score: number;
  intent_reasoning: string | null;
  recommended_action: string | null;
  summary: string | null;
  message_count: number;
  started_at: string;
  last_message_at: string;
  ended_at: string | null;
  host_action_status: string;
  agents: {
    display_name: string;
    id: string;
  };
  hosts: {
    id: string;
    company_name: string;
    plan: string;
    user_email: string;
  };
  visitors: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    company: string | null;
    role: string | null;
    problem: string | null;
    budget_signal: string | null;
    urgency_signal: string | null;
    decision_authority: string | null;
    current_intent_score: number;
  };
  messages: {
    id: string;
    role: string;
    content: string;
    created_at: string;
  }[];
}

/**
 * Fetch a conversation with all related data needed for a report.
 */
async function getConversationFull(conversationId: string): Promise<ConversationFull | null> {
  const { data: conv } = await supabase
    .from('conversations')
    .select(`
      id, agent_id, host_id, visitor_id, source_page_url, intent_score, intent_reasoning,
      recommended_action, summary, message_count, started_at, last_message_at, ended_at, host_action_status,
      agents!inner(id, display_name),
      hosts!inner(id, company_name, plan, user_id),
      visitors!inner(id, name, email, phone, company, role, problem, budget_signal, urgency_signal, decision_authority, current_intent_score)
    `)
    .eq('id', conversationId)
    .maybeSingle();

  if (!conv) return null;

  // Get user email from auth
  const hostUserId = (conv.hosts as Record<string, string>).user_id;
  const { data: { user: hostUser } } = await supabase.auth.admin.getUserById(hostUserId);

  // Get messages
  const { data: messages } = await supabase
    .from('messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  const agent = conv.agents as Record<string, string>;
  const host = conv.hosts as Record<string, string>;
  const visitor = conv.visitors as unknown as ConversationFull['visitors'];

  return {
    id: conv.id,
    agent_id: conv.agent_id,
    host_id: conv.host_id,
    visitor_id: conv.visitor_id,
    source_page_url: conv.source_page_url,
    intent_score: conv.intent_score,
    intent_reasoning: conv.intent_reasoning,
    recommended_action: conv.recommended_action,
    summary: conv.summary,
    message_count: conv.message_count,
    started_at: conv.started_at,
    last_message_at: conv.last_message_at,
    ended_at: conv.ended_at,
    host_action_status: conv.host_action_status,
    agents: {
      id: agent.id,
      display_name: agent.display_name,
    },
    hosts: {
      id: host.id,
      company_name: host.company_name,
      plan: host.plan,
      user_email: hostUser?.email ?? '',
    },
    visitors: visitor,
    messages: messages ?? [],
  };
}

/**
 * Build email subject line.
 */
function buildSubject(conv: ConversationFull, type: ReportType): string {
  const visitorName = conv.visitors.name || conv.visitors.email || 'New visitor';
  const company = conv.visitors.company ? ` · ${conv.visitors.company}` : '';
  const score = conv.intent_score;

  switch (type) {
    case 'hot_lead':
      return `🟢 Hot lead — ${visitorName}${company} · intent ${score}/100`;
    case 'completed':
      return `${conv.agents.display_name} — ${visitorName} — intent ${score}/100`;
    case 'long_conversation':
      return `Active conversation — ${visitorName}`;
  }
}

/**
 * Build signal badge HTML.
 */
function signalBadge(label: string, value: string | null): string {
  if (!value || value === 'unknown') return '';
  const colors: Record<string, string> = {
    high: '#dcfce7; color: #166534',
    medium: '#fef9c3; color: #854d0e',
    low: '#fee2e2; color: #991b1b',
    decision_maker: '#dbeafe; color: #1e40af',
    influencer: '#ede9fe; color: #5b21b6',
    researcher: '#f3f4f6; color: #374151',
  };
  const style = colors[value] ?? '#f3f4f6; color: #374151';
  return `<span style="background: ${style}; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;">${label}: ${value}</span>`;
}

/**
 * Render the report as HTML.
 */
function renderReportHtml(conv: ConversationFull, type: ReportType): string {
  const visitor = conv.visitors;
  const agent = conv.agents;
  const host = conv.hosts;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.discoverycall.ai';

  const durationMinutes = Math.round(
    (new Date(conv.last_message_at).getTime() - new Date(conv.started_at).getTime()) / 60000
  );

  const intentColor = conv.intent_score >= 70 ? '#166534' : conv.intent_score >= 40 ? '#854d0e' : '#374151';
  const intentBg = conv.intent_score >= 70 ? '#dcfce7' : conv.intent_score >= 40 ? '#fef9c3' : '#f3f4f6';

  const recommendedActionLabel: Record<string, string> = {
    book_call: 'Book a discovery call',
    send_resource: 'Send a resource',
    continue_discovery: 'Continue discovery',
    nurture: 'Add to nurture sequence',
    human_handoff: 'Escalate to human',
  };

  const headerCopy = {
    hot_lead: `<p style="color: #166534; font-size: 16px; font-weight: 600; margin: 0 0 4px;">A new hot lead just talked to your agent.</p>`,
    completed: `<p style="color: #374151; font-size: 16px; font-weight: 500; margin: 0 0 4px;">Your agent finished a conversation.</p>`,
    long_conversation: `<p style="color: #854d0e; font-size: 16px; font-weight: 500; margin: 0 0 4px;">Heads up — a conversation has been going for ${durationMinutes} minutes.</p>`,
  };

  const transcript = conv.messages
    .map((m) => {
      const roleLabel = m.role === 'visitor' ? '👤 Visitor' : m.role === 'agent' ? '🤖 Agent' : '⚙️ System';
      const time = new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      return `
        <div style="margin-bottom: 16px; padding: 12px; background: ${m.role === 'visitor' ? '#f9fafb' : '#eff6ff'}; border-radius: 8px;">
          <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">${roleLabel} · ${time}</div>
          <div style="font-size: 14px; color: #111827; white-space: pre-wrap;">${m.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${buildSubject(conv, type)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px 16px;">
    
    <!-- Header -->
    <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
        <div style="width: 32px; height: 32px; background: #1783F1; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px;">⚡</div>
        <div>
          <div style="font-size: 13px; font-weight: 600; color: #111827;">${agent.display_name}</div>
          <div style="font-size: 11px; color: #6b7280;">${host.company_name}</div>
        </div>
      </div>
      ${headerCopy[type]}
    </div>

    <!-- Visitor Profile -->
    <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
      <div style="font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px;">Visitor</div>
      
      <div style="font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 4px;">
        ${visitor.name || visitor.email || 'Anonymous Visitor'}
      </div>
      
      ${visitor.email ? `<div style="color: #1783F1; font-size: 14px; margin-bottom: 4px;"><a href="mailto:${visitor.email}" style="color: #1783F1; text-decoration: none;">${visitor.email}</a></div>` : ''}
      ${visitor.phone ? `<div style="color: #374151; font-size: 14px; margin-bottom: 4px;">📞 ${visitor.phone}</div>` : ''}
      ${visitor.company || visitor.role ? `<div style="color: #374151; font-size: 14px; margin-bottom: 12px;">${[visitor.role, visitor.company].filter(Boolean).join(' at ')}</div>` : ''}
      
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
        ${signalBadge('Budget', visitor.budget_signal)}
        ${signalBadge('Urgency', visitor.urgency_signal)}
        ${signalBadge('Authority', visitor.decision_authority)}
      </div>
    </div>

    <!-- Intent Score -->
    <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Intent Score</div>
        <div style="background: ${intentBg}; color: ${intentColor}; font-size: 22px; font-weight: 800; padding: 4px 16px; border-radius: 20px;">${conv.intent_score}/100</div>
      </div>
      ${conv.intent_reasoning ? `<p style="color: #374151; font-size: 14px; margin: 0;">${conv.intent_reasoning}</p>` : ''}
    </div>

    ${visitor.problem ? `
    <!-- What They're Working On -->
    <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
      <div style="font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">What They're Working On</div>
      <p style="color: #374151; font-size: 14px; margin: 0;">${visitor.problem}</p>
    </div>
    ` : ''}

    ${conv.recommended_action ? `
    <!-- Recommended Action -->
    <div style="background: ${type === 'hot_lead' ? '#dcfce7' : '#eff6ff'}; border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid ${type === 'hot_lead' ? '#bbf7d0' : '#bfdbfe'};">
      <div style="font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Recommended Next Action</div>
      <div style="font-size: 16px; font-weight: 600; color: ${type === 'hot_lead' ? '#166534' : '#1e40af'};">
        ${recommendedActionLabel[conv.recommended_action] ?? conv.recommended_action}
      </div>
    </div>
    ` : ''}

    <!-- CTA Buttons -->
    <div style="display: flex; gap: 12px; margin-bottom: 16px;">
      <a href="${appUrl}/conversations/${conv.id}" style="flex: 1; background: #1783F1; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; text-align: center; display: block;">
        View in Dashboard →
      </a>
    </div>

    <!-- Conversation Meta -->
    <div style="background: white; border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
      <div style="display: flex; gap: 24px; font-size: 12px; color: #6b7280;">
        ${conv.source_page_url ? `<div>Source: <a href="${conv.source_page_url}" style="color: #1783F1;">${conv.source_page_url}</a></div>` : ''}
        <div>Messages: ${conv.message_count}</div>
        <div>Duration: ${durationMinutes} min</div>
        <div>Started: ${new Date(conv.started_at).toLocaleString()}</div>
      </div>
      ${type === 'long_conversation' ? `<div style="margin-top: 8px; font-size: 12px; color: #854d0e; font-style: italic;">Conversation is still ongoing. We'll send a final report when it ends.</div>` : ''}
    </div>

    <!-- Transcript -->
    <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
      <div style="font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px;">Full Conversation</div>
      ${transcript || '<p style="color: #9ca3af; font-size: 14px;">No messages recorded.</p>'}
    </div>

    <!-- Footer -->
    <div style="text-align: center; font-size: 11px; color: #9ca3af; padding: 16px 0;">
      Sent by DiscoveryCall · <a href="${appUrl}" style="color: #1783F1; text-decoration: none;">app.discoverycall.ai</a>
      · <a href="mailto:support@discoverycall.ai" style="color: #9ca3af; text-decoration: none;">support@discoverycall.ai</a>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Render plain-text version.
 */
function renderReportText(conv: ConversationFull, type: ReportType): string {
  const visitor = conv.visitors;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.discoverycall.ai';
  const durationMinutes = Math.round(
    (new Date(conv.last_message_at).getTime() - new Date(conv.started_at).getTime()) / 60000
  );

  const lines: string[] = [
    buildSubject(conv, type),
    '='.repeat(60),
    '',
    `Visitor: ${visitor.name || visitor.email || 'Anonymous'}`,
    visitor.email ? `Email: ${visitor.email}` : '',
    visitor.phone ? `Phone: ${visitor.phone}` : '',
    visitor.company ? `Company: ${visitor.company}` : '',
    visitor.role ? `Role: ${visitor.role}` : '',
    '',
    `Intent Score: ${conv.intent_score}/100`,
    conv.intent_reasoning ? `Reasoning: ${conv.intent_reasoning}` : '',
    '',
    visitor.problem ? `Problem: ${visitor.problem}` : '',
    conv.recommended_action ? `Recommended Action: ${conv.recommended_action}` : '',
    '',
    `Dashboard: ${appUrl}/conversations/${conv.id}`,
    '',
    '-'.repeat(60),
    'TRANSCRIPT',
    '-'.repeat(60),
    ...conv.messages.map((m) => {
      const roleLabel = m.role === 'visitor' ? 'Visitor' : m.role === 'agent' ? 'Agent' : 'System';
      const time = new Date(m.created_at).toLocaleTimeString();
      return `[${time}] ${roleLabel}: ${m.content}`;
    }),
    '',
    `Messages: ${conv.message_count} · Duration: ${durationMinutes} min`,
    conv.source_page_url ? `Source: ${conv.source_page_url}` : '',
  ].filter((l): l is string => l !== '');

  return lines.join('\n');
}

/**
 * Core sendReport function.
 * Sends an email report for a conversation.
 * Idempotent: checks events table before sending.
 *
 * @param conversationId - The conversation to report on
 * @param type - hot_lead | completed | long_conversation
 */
export async function sendReport(
  conversationId: string,
  type: ReportType
): Promise<void> {
  const eventType = `report_sent_${type}`;

  // Idempotency check — indexed lookup on events.conversation_id + event_type
  const { data: existing } = await supabase
    .from('events')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('event_type', eventType)
    .limit(1)
    .maybeSingle();

  if (existing) return; // Already sent

  // Fetch full conversation data
  const conv = await getConversationFull(conversationId);
  if (!conv) {
    console.error(`[sendReport] Conversation not found: ${conversationId}`);
    return;
  }

  if (!conv.hosts.user_email) {
    console.error(`[sendReport] No email for host ${conv.host_id}`);
    return;
  }

  const subject = buildSubject(conv, type);
  const html = renderReportHtml(conv, type);
  const text = renderReportText(conv, type);

  try {
    await resend.emails.send({
      from: `${conv.agents.display_name} via DiscoveryCall <reports@discoverycall.ai>`,
      to: conv.hosts.user_email,
      subject,
      html,
      text,
      reply_to: 'support@discoverycall.ai',
    });

    // Record in events table — sole source of truth for "did we send this?"
    await supabase.from('events').insert({
      host_id: conv.host_id,
      conversation_id: conversationId,
      event_type: eventType,
      event_data: {
        type,
        sent_to: conv.hosts.user_email,
        sent_at: new Date().toISOString(),
        visitor_name: conv.visitors.name,
        visitor_email: conv.visitors.email,
        intent_score: conv.intent_score,
      },
    });

    console.log(`[sendReport] Sent ${type} report for conversation ${conversationId} to ${conv.hosts.user_email}`);
  } catch (err) {
    console.error(`[sendReport] Failed to send ${type} report:`, err);
    throw err;
  }
}

/**
 * Weekly summary report — sent every Monday 9am host timezone.
 * Summarizes the past 7 days across all agents for a host.
 */
export async function sendWeeklySummaryReport(hostId: string): Promise<void> {
  const eventType = 'weekly_summary_sent';
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const periodKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Idempotency: one per week per host
  const { data: existing } = await supabase
    .from('events')
    .select('id')
    .eq('host_id', hostId)
    .eq('event_type', eventType)
    .gte('created_at', weekAgo)
    .limit(1)
    .maybeSingle();

  if (existing) return;

  // Get host + user email
  const { data: host } = await supabase
    .from('hosts')
    .select('id, company_name, plan, user_id')
    .eq('id', hostId)
    .maybeSingle();

  if (!host) return;

  const { data: { user: hostUser } } = await supabase.auth.admin.getUserById(host.user_id);
  if (!hostUser?.email) return;

  // Gather stats
  const { count: totalConversations } = await supabase
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .eq('host_id', hostId)
    .gte('started_at', weekAgo);

  const { count: hotLeads } = await supabase
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .eq('host_id', hostId)
    .gte('started_at', weekAgo)
    .gte('intent_score', 70);

  const { data: agents } = await supabase
    .from('agents')
    .select('id, display_name')
    .eq('host_id', hostId);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.discoverycall.ai';

  const agentRows = (agents ?? []).map(a => `
    <tr>
      <td style="padding: 10px; font-size: 14px;">${a.display_name}</td>
      <td style="padding: 10px; text-align: center; font-size: 14px;">—</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; background: #f9fafb; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px 16px;">
    <div style="background: white; border-radius: 12px; padding: 24px; border: 1px solid #e5e7eb; margin-bottom: 16px;">
      <div style="font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 4px;">Your weekly summary</div>
      <div style="font-size: 14px; color: #6b7280;">Week ending ${new Date().toLocaleDateString()}</div>
    </div>
    <div style="display: flex; gap: 12px; margin-bottom: 16px;">
      <div style="flex: 1; background: white; border-radius: 12px; padding: 20px; border: 1px solid #e5e7eb; text-align: center;">
        <div style="font-size: 36px; font-weight: 800; color: #1783F1;">${totalConversations ?? 0}</div>
        <div style="font-size: 13px; color: #6b7280;">Conversations</div>
      </div>
      <div style="flex: 1; background: white; border-radius: 12px; padding: 20px; border: 1px solid #e5e7eb; text-align: center;">
        <div style="font-size: 36px; font-weight: 800; color: #166534;">${hotLeads ?? 0}</div>
        <div style="font-size: 13px; color: #6b7280;">Hot leads</div>
      </div>
    </div>
    <div style="background: white; border-radius: 12px; padding: 24px; border: 1px solid #e5e7eb; margin-bottom: 16px;">
      <div style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 12px;">Agents</div>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <th style="text-align: left; padding: 8px; font-size: 12px; color: #6b7280;">Agent</th>
            <th style="text-align: center; padding: 8px; font-size: 12px; color: #6b7280;">Conversations</th>
          </tr>
        </thead>
        <tbody>${agentRows}</tbody>
      </table>
    </div>
    <a href="${appUrl}/dashboard" style="display: block; background: #1783F1; color: white; padding: 14px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; text-align: center; margin-bottom: 16px;">
      View full dashboard →
    </a>
    <div style="text-align: center; font-size: 11px; color: #9ca3af;">
      DiscoveryCall · <a href="${appUrl}" style="color: #9ca3af;">app.discoverycall.ai</a>
    </div>
  </div>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: 'DiscoveryCall <reports@discoverycall.ai>',
      to: hostUser.email,
      subject: `Your DiscoveryCall weekly summary — ${totalConversations ?? 0} conversations, ${hotLeads ?? 0} hot leads`,
      html,
      text: `Weekly Summary\n\nConversations: ${totalConversations ?? 0}\nHot leads: ${hotLeads ?? 0}\n\nView dashboard: ${appUrl}/dashboard`,
      reply_to: 'support@discoverycall.ai',
    });

    await supabase.from('events').insert({
      host_id: hostId,
      event_type: eventType,
      event_data: {
        period_key: periodKey,
        total_conversations: totalConversations,
        hot_leads: hotLeads,
        sent_to: hostUser.email,
      },
    });
  } catch (err) {
    console.error(`[sendWeeklySummaryReport] Failed for host ${hostId}:`, err);
  }
}
