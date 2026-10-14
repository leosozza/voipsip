import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CallLog, CallStatus, DialMode } from '@/lib/api';
import type { RegistrationState } from '@/lib/webrtc-phone';

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export const CALL_STATUS: Record<CallStatus, { label: string; tone: Tone }> = {
  dialing: { label: 'Discando', tone: 'info' },
  ringing: { label: 'Tocando', tone: 'info' },
  answered: { label: 'Em andamento', tone: 'success' },
  completed: { label: 'Concluída', tone: 'success' },
  missed: { label: 'Perdida', tone: 'warning' },
  failed: { label: 'Falhou', tone: 'danger' },
};

export const RECORDING_STATUS: Record<NonNullable<CallLog['recording_status']>, { label: string; tone: Tone }> = {
  attached: { label: 'Anexada', tone: 'success' },
  failed: { label: 'Falhou', tone: 'danger' },
  not_found: { label: 'Não encontrada', tone: 'neutral' },
};

export const SOURCE_LABEL: Record<string, string> = {
  microsip: 'MicroSIP',
  webrtc: 'WebRTC',
};

export const DIAL_MODE_LABEL: Record<DialMode, string> = {
  microsip: 'MicroSIP',
  webrtc: 'Softphone embutido',
};

export const REGISTRATION: Record<RegistrationState, { label: string; tone: Tone }> = {
  registered: { label: 'Registrado', tone: 'success' },
  connecting: { label: 'Conectando…', tone: 'info' },
  disconnected: { label: 'Desconectado', tone: 'neutral' },
  error: { label: 'Erro de registro', tone: 'danger' },
};

/** Tailwind classes per tone, all mapped to design tokens. */
export const TONE_CLASS: Record<Tone, { badge: string; dot: string; text: string }> = {
  neutral: { badge: 'border-transparent bg-muted text-muted-foreground', dot: 'bg-muted-foreground/60', text: 'text-muted-foreground' },
  info: { badge: 'border-transparent bg-info/15 text-info', dot: 'bg-info', text: 'text-info' },
  success: { badge: 'border-transparent bg-success/15 text-success', dot: 'bg-success', text: 'text-success' },
  warning: { badge: 'border-transparent bg-warning/20 text-warning-foreground dark:text-warning', dot: 'bg-warning', text: 'text-warning' },
  danger: { badge: 'border-transparent bg-destructive/15 text-destructive', dot: 'bg-destructive', text: 'text-destructive' },
};

/** 0 → "0:00", 75 → "1:15", 3725 → "1:02:05". */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** Human readable duration: "45s", "3min 05s", "2h 10min". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  return `${m}min ${String(s % 60).padStart(2, '0')}s`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return format(new Date(iso), 'dd/MM/yyyy HH:mm', { locale: ptBR });
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return 'nunca';
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR });
}
