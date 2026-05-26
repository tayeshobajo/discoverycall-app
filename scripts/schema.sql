-- DiscoveryCall — Full Database Schema (Sprint 1)
-- Apply via Supabase SQL Editor or psql

-- ============ EXTENSIONS ============
create extension if not exists "pgcrypto";

-- ============ ENUMS ============
create type plan_tier as enum ('starter', 'pro', 'agency', 'enterprise');
create type trial_status as enum ('active', 'expired', 'converted', 'cancelled');
create type google_auth_state as enum ('never_connected', 'connected', 'needs_reauth', 'disconnected');
create type conversation_status as enum ('active', 'idle', 'completed', 'abandoned', 'error');
create type lead_status as enum ('new', 'contacted', 'booked', 'dismissed');
create type agent_status as enum ('draft', 'building', 'ready', 'paused');
create type onboarding_step as enum ('welcome', 'connect_google', 'build_agent', 'personalize', 'install', 'complete', 'skipped');

-- ============ PLAN LIMITS (config table) ============
create table plan_limits (
  plan plan_tier primary key,
  max_agents int not null,
  max_conversations_per_month int, -- null means unlimited
  max_team_seats int not null default 1,
  white_label_enabled boolean default false,
  priority_support boolean default false
);

insert into plan_limits (plan, max_agents, max_conversations_per_month, max_team_seats, white_label_enabled) values
  ('starter', 1, 200, 1, false),
  ('pro', 3, null, 1, true),
  ('agency', 10, null, 3, true),
  ('enterprise', 999, null, 999, true);

-- ============ HOSTS ============
create table hosts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  plan plan_tier not null default 'starter',
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_status trial_status not null default 'active',
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  google_auth_status google_auth_state not null default 'never_connected',
  google_oauth_access_token bytea, -- encrypted via pgsodium (Phase 1.5)
  google_oauth_refresh_token bytea, -- encrypted via pgsodium (Phase 1.5)
  google_oauth_expires_at timestamptz,
  google_account_email text,
  onboarding_step onboarding_step not null default 'welcome',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_hosts_user_id on hosts(user_id);
create index idx_hosts_stripe_customer on hosts(stripe_customer_id);
create index idx_hosts_trial_status on hosts(trial_status) where trial_status = 'active';

-- ============ AGENTS ============
create table agents (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references hosts(id) on delete cascade,
  internal_name text not null,
  display_name text not null default 'DiscoveryCall',
  status agent_status not null default 'draft',
  google_doc_id text,
  doc_version text,
  parsed_content jsonb,
  last_fetched_at timestamptz,
  completed_sections jsonb not null default '[]'::jsonb,
  -- 256-bit cryptographically secure embed token
  embed_token text unique not null default encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_agents_host_id on agents(host_id);
create index idx_agents_embed_token on agents(embed_token);
create index idx_agents_status on agents(host_id, status);

-- ============ AGENT CONFIG ============
create table agent_config (
  agent_id uuid primary key references agents(id) on delete cascade,
  theme_color text not null default '#1783F1',
  theme_color_accent text,
  logo_url text,
  favicon_url text,
  agent_avatar_url text,
  button_position text not null default 'bottom-right' check (button_position in ('bottom-right', 'bottom-left', 'custom')),
  button_shape text not null default 'circle' check (button_shape in ('circle', 'pill', 'square')),
  button_size text not null default 'medium' check (button_size in ('small', 'medium', 'large')),
  button_icon_url text,
  pulse_animation boolean not null default true,
  greeting_title text not null default 'Let''s have coffee',
  greeting_message text,
  tone_preset text not null default 'warm' check (tone_preset in ('warm', 'direct', 'spirit_first', 'custom')),
  cta_type text not null default 'book_call' check (cta_type in ('book_call', 'send_email', 'send_proposal', 'custom')),
  cta_url text,
  calendar_provider text check (calendar_provider in ('cal_com', 'calendly') or calendar_provider is null),
  calendar_url text,
  hours_of_operation jsonb,
  contact_capture_timing text not null default 'after_intent' check (contact_capture_timing in ('early', 'mid', 'after_intent')),
  show_discoverycall_branding boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ============ VISITORS (host-scoped) ============
create table visitors (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references hosts(id) on delete cascade,
  fingerprint text not null,
  email text,
  phone text,
  name text,
  company text,
  role text,
  problem text,
  budget_signal text check (budget_signal in ('high', 'medium', 'low', 'unknown') or budget_signal is null),
  urgency_signal text check (urgency_signal in ('high', 'medium', 'low', 'unknown') or urgency_signal is null),
  decision_authority text check (decision_authority in ('decision_maker', 'influencer', 'researcher', 'unknown') or decision_authority is null),
  custom_fields jsonb not null default '{}'::jsonb,
  current_intent_score int not null default 0 check (current_intent_score between 0 and 100),
  current_intent_reasoning text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique(host_id, fingerprint)
);

create index idx_visitors_host_id on visitors(host_id);
create index idx_visitors_email on visitors(host_id, email) where email is not null;
create index idx_visitors_intent on visitors(host_id, current_intent_score desc);

-- ============ CONVERSATIONS ============
create table conversations (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  host_id uuid not null references hosts(id) on delete cascade,
  visitor_id uuid not null references visitors(id) on delete cascade,
  source_page_url text,
  source_referrer text,
  user_agent text,
  status conversation_status not null default 'active',
  intent_score int not null default 0 check (intent_score between 0 and 100),
  intent_reasoning text,
  recommended_action text,
  summary text,
  history_summary text,
  message_count int not null default 0,
  started_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  ended_at timestamptz,
  host_action_status lead_status not null default 'new'
);

create index idx_conversations_agent_id on conversations(agent_id, started_at desc);
create index idx_conversations_host_id on conversations(host_id, started_at desc);
create index idx_conversations_visitor_id on conversations(visitor_id);
create index idx_conversations_new on conversations(host_id, host_action_status) where host_action_status = 'new';
create index idx_conversations_active on conversations(host_id, status, last_message_at) where status in ('active', 'idle');

-- ============ MESSAGES ============
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('visitor', 'agent', 'system')),
  content text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_messages_conversation_id on messages(conversation_id, created_at);

-- ============ LEAD ACTIONS ============
create table lead_actions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references hosts(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid references auth.users(id),
  action_type text not null check (action_type in ('contacted', 'booked', 'email_sent', 'dismissed', 'exported', 'note_added')),
  notes text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ============ EVENTS (audit log + report idempotency) ============
create table events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid references hosts(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete cascade,
  event_type text not null,
  event_data jsonb,
  created_at timestamptz not null default now()
);

create index idx_events_host_id on events(host_id, created_at desc);
create index idx_events_conversation_id on events(conversation_id, event_type) where conversation_id is not null;

-- ============ TRIGGERS ============

-- Universal updated_at trigger
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger hosts_updated_at before update on hosts
  for each row execute function set_updated_at();

create trigger agents_updated_at before update on agents
  for each row execute function set_updated_at();

create trigger agent_config_updated_at before update on agent_config
  for each row execute function set_updated_at();

-- Auto-increment message_count + last_message_at on conversations
create or replace function increment_message_count()
returns trigger as $$
begin
  update conversations
  set message_count = message_count + 1,
      last_message_at = now()
  where id = new.conversation_id;
  return new;
end;
$$ language plpgsql;

create trigger messages_increment_count after insert on messages
  for each row execute function increment_message_count();

-- Enforce agent count limit per host (defense in depth)
create or replace function check_agent_limit()
returns trigger as $$
declare
  current_count int;
  plan_limit int;
begin
  select count(*) into current_count from agents where host_id = new.host_id;
  select max_agents into plan_limit from plan_limits pl
    join hosts h on h.plan = pl.plan
    where h.id = new.host_id;
  if current_count >= plan_limit then
    raise exception 'Agent limit reached for current plan (% / %)', current_count, plan_limit;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger agents_check_limit before insert on agents
  for each row execute function check_agent_limit();

-- Visitor last_seen_at refresh
create or replace function update_visitor_last_seen()
returns trigger as $$
begin
  update visitors set last_seen_at = now() where id = new.visitor_id;
  return new;
end;
$$ language plpgsql;

create trigger conversations_update_visitor_seen after insert or update on conversations
  for each row execute function update_visitor_last_seen();

-- ============ ROW LEVEL SECURITY ============
alter table hosts enable row level security;
alter table agents enable row level security;
alter table agent_config enable row level security;
alter table visitors enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table lead_actions enable row level security;
alter table events enable row level security;

-- Hosts: only owner can access
create policy hosts_select on hosts for select using (user_id = auth.uid());
create policy hosts_insert on hosts for insert with check (user_id = auth.uid());
create policy hosts_update on hosts for update using (user_id = auth.uid());
create policy hosts_delete on hosts for delete using (user_id = auth.uid());

-- Helper: get host_ids for current user
create or replace function user_host_ids() returns setof uuid as $$
  select id from hosts where user_id = auth.uid();
$$ language sql stable security definer set search_path = public;

-- Pattern repeated for each table:
create policy agents_all on agents for all using (host_id in (select user_host_ids()));

create policy agent_config_all on agent_config for all using (
  agent_id in (select id from agents where host_id in (select user_host_ids()))
);

create policy visitors_all on visitors for all using (host_id in (select user_host_ids()));

create policy conversations_all on conversations for all using (host_id in (select user_host_ids()));

create policy messages_all on messages for all using (
  conversation_id in (select id from conversations where host_id in (select user_host_ids()))
);

create policy lead_actions_all on lead_actions for all using (host_id in (select user_host_ids()));

create policy events_select on events for select using (host_id in (select user_host_ids()));
