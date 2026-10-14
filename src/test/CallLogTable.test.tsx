import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CallLogTable } from '@/components/calls/CallLogTable';
import type { CallLog } from '@/lib/api';

const base: CallLog = {
  id: '1',
  direction: 'inbound',
  phone_number: '11999990000',
  status: 'failed',
  source: 'webrtc',
  bitrix_call_id: null,
  bitrix_user_id: null,
  crm_entity_type: null,
  crm_entity_id: null,
  duration_seconds: 95,
  recording_file: null,
  recording_status: 'attached',
  error: 'Linha ocupada',
  call_started_at: '2026-10-14T12:00:00.000Z',
  call_answered_at: null,
  call_ended_at: null,
};

describe('CallLogTable', () => {
  it('renders Portuguese labels, duration and the error affordance', () => {
    render(
      <TooltipProvider>
        <CallLogTable calls={[base]} />
      </TooltipProvider>,
    );
    expect(screen.getByText('Falhou')).toBeInTheDocument();
    expect(screen.getByText('1:35')).toBeInTheDocument();
    expect(screen.getByText('WebRTC')).toBeInTheDocument();
    expect(screen.getByText('Anexada')).toBeInTheDocument();
    expect(screen.getByText('Recebida')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Erro: Linha ocupada' })).toBeInTheDocument();
  });

  it('shows an empty state', () => {
    render(<CallLogTable calls={[]} emptyMessage="Sem chamadas hoje" />);
    expect(screen.getByText('Sem chamadas hoje')).toBeInTheDocument();
  });
});
