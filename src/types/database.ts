// DiscoveryCall — Database Types

export type PlanTier = 'starter' | 'pro' | 'agency' | 'enterprise';
export type TrialStatus = 'active' | 'expired' | 'converted' | 'cancelled';
export type GoogleAuthState = 'never_connected' | 'connected' | 'needs_reauth' | 'disconnected';
export type ConversationStatus = 'active' | 'idle' | 'completed' | 'abandoned' | 'error';
export type LeadStatus = 'new' | 'contacted' | 'booked' | 'dismissed';
export type AgentStatus = 'draft' | 'building' | 'ready' | 'paused' | 'archived';
export type OnboardingStep = 'welcome' | 'connect_google' | 'build_agent' | 'personalize' | 'install' | 'complete' | 'skipped';

export interface PlanLimits {
  plan: PlanTier;
  max_agents: number;
  max_conversations_per_month: number | null;
  max_team_seats: number;
  white_label_enabled: boolean;
  priority_support: boolean;
}

export interface Host {
  id: string;
  user_id: string;
  company_name: string;
  plan: PlanTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_status: TrialStatus;
  trial_ends_at: string;
  google_auth_status: GoogleAuthState;
  google_oauth_expires_at: string | null;
  google_account_email: string | null;
  onboarding_step: OnboardingStep;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  host_id: string;
  internal_name: string;
  display_name: string;
  status: AgentStatus;
  google_doc_id: string | null;
  doc_version: string | null;
  parsed_content: Record<string, unknown> | null;
  last_fetched_at: string | null;
  completed_sections: string[];
  embed_token: string;
  created_at: string;
  updated_at: string;
}

export interface AgentConfig {
  agent_id: string;
  theme_color: string;
  theme_color_accent: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  agent_avatar_url: string | null;
  button_position: 'bottom-right' | 'bottom-left' | 'custom';
  button_shape: 'circle' | 'pill' | 'square';
  button_size: 'small' | 'medium' | 'large';
  button_icon_url: string | null;
  pulse_animation: boolean;
  greeting_title: string;
  greeting_message: string | null;
  tone_preset: 'warm' | 'direct' | 'spirit_first' | 'custom';
  cta_type: 'book_call' | 'send_email' | 'send_proposal' | 'custom';
  cta_url: string | null;
  calendar_provider: 'cal_com' | 'calendly' | null;
  calendar_url: string | null;
  hours_of_operation: HoursOfOperation | null;
  contact_capture_timing: 'early' | 'mid' | 'after_intent';
  show_discoverycall_branding: boolean;
  updated_at: string;
}

export interface HoursOfOperation {
  mode: 'always' | 'business_hours' | 'custom';
  timezone: string;
  schedule?: {
    mon: { enabled: boolean; open: string | null; close: string | null };
    tue: { enabled: boolean; open: string | null; close: string | null };
    wed: { enabled: boolean; open: string | null; close: string | null };
    thu: { enabled: boolean; open: string | null; close: string | null };
    fri: { enabled: boolean; open: string | null; close: string | null };
    sat: { enabled: boolean; open: string | null; close: string | null };
    sun: { enabled: boolean; open: string | null; close: string | null };
  };
  off_hours_behavior?: 'show_widget' | 'hide_widget' | 'show_message';
  off_hours_message?: string;
}

export interface Visitor {
  id: string;
  host_id: string;
  fingerprint: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  company: string | null;
  role: string | null;
  problem: string | null;
  budget_signal: 'high' | 'medium' | 'low' | 'unknown' | null;
  urgency_signal: 'high' | 'medium' | 'low' | 'unknown' | null;
  decision_authority: 'decision_maker' | 'influencer' | 'researcher' | 'unknown' | null;
  custom_fields: Record<string, unknown>;
  current_intent_score: number;
  current_intent_reasoning: string | null;
  first_seen_at: string;
  last_seen_at: string;
}

export interface Conversation {
  id: string;
  agent_id: string;
  host_id: string;
  visitor_id: string;
  source_page_url: string | null;
  source_referrer: string | null;
  user_agent: string | null;
  status: ConversationStatus;
  intent_score: number;
  intent_reasoning: string | null;
  recommended_action: string | null;
  summary: string | null;
  history_summary: string | null;
  message_count: number;
  started_at: string;
  last_message_at: string;
  ended_at: string | null;
  host_action_status: LeadStatus;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'visitor' | 'agent' | 'system';
  content: string;
  metadata: MessageMetadata | null;
  created_at: string;
}

export interface MessageMetadata {
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  latency_ms?: number;
  stop_reason?: string;
  tool_calls?: unknown[];
  intent_signals_detected?: string[];
  type?: 'fallback' | 'summary_refresh' | 'trigger_note';
  reason?: string;
}

export interface LeadAction {
  id: string;
  host_id: string;
  conversation_id: string;
  user_id: string | null;
  action_type: 'contacted' | 'booked' | 'email_sent' | 'dismissed' | 'exported' | 'note_added';
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Event {
  id: string;
  host_id: string | null;
  conversation_id: string | null;
  event_type: string;
  event_data: Record<string, unknown> | null;
  created_at: string;
}

// Database type map for Supabase client
export interface Database {
  public: {
    Tables: {
      plan_limits: { Row: PlanLimits; Insert: Partial<PlanLimits>; Update: Partial<PlanLimits> };
      hosts: { Row: Host; Insert: Omit<Host, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Host> };
      agents: { Row: Agent; Insert: Omit<Agent, 'id' | 'created_at' | 'updated_at' | 'embed_token'>; Update: Partial<Agent> };
      agent_config: { Row: AgentConfig; Insert: Omit<AgentConfig, 'updated_at'>; Update: Partial<AgentConfig> };
      visitors: { Row: Visitor; Insert: Omit<Visitor, 'id' | 'first_seen_at' | 'last_seen_at'>; Update: Partial<Visitor> };
      conversations: { Row: Conversation; Insert: Omit<Conversation, 'id' | 'started_at' | 'last_message_at'>; Update: Partial<Conversation> };
      messages: { Row: Message; Insert: Omit<Message, 'id' | 'created_at'>; Update: Partial<Message> };
      lead_actions: { Row: LeadAction; Insert: Omit<LeadAction, 'id' | 'created_at'>; Update: Partial<LeadAction> };
      events: { Row: Event; Insert: Omit<Event, 'id' | 'created_at'>; Update: Partial<Event> };
    };
    Functions: {
      user_host_ids: { Args: Record<string, never>; Returns: string[] };
    };
    Enums: {
      plan_tier: PlanTier;
      trial_status: TrialStatus;
      google_auth_state: GoogleAuthState;
      conversation_status: ConversationStatus;
      lead_status: LeadStatus;
      agent_status: AgentStatus;
      onboarding_step: OnboardingStep;
    };
  };
}
