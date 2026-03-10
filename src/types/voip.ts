// Types for VoIP Telephony Application

export interface Company {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: 'admin' | 'member';
  created_at: string;
}

export interface SipAccount {
  id: string;
  company_id: string;
  display_name: string;
  sip_server: string;
  sip_domain: string | null;
  ws_port: number;
  transport: string;
  sip_username: string;
  sip_password: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  company_id: string;
  name: string;
  phone: string;
  email: string | null;
  company_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Extension {
  id: string;
  company_id: string;
  sip_account_id: string | null;
  extension_number: string;
  display_name: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExternalPhoneLine {
  id: string;
  company_id: string;
  line_number: string;
  line_name: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CallLog {
  id: string;
  company_id: string;
  user_mapping_id: string | null;
  external_line_id: string | null;
  direction: 'inbound' | 'outbound';
  phone_number: string;
  status: 'ringing' | 'answered' | 'missed' | 'busy' | 'failed' | 'completed';
  duration_seconds: number;
  recording_url: string | null;
  sip_call_id: string | null;
  caller_name: string | null;
  call_started_at: string;
  call_ended_at: string | null;
  created_at: string;
}

export interface CallMetrics {
  total_calls: number;
  inbound_calls: number;
  outbound_calls: number;
  answered_calls: number;
  missed_calls: number;
  total_duration: number;
  average_duration: number;
}

export type SipRegistrationState = 'unregistered' | 'registering' | 'registered' | 'error';
export type CallState = 'idle' | 'calling' | 'ringing' | 'answered' | 'ended';
