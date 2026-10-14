import { describe, expect, it } from 'vitest';
import { formatClock, formatDuration } from '@/lib/format';
import { filterCalls } from '@/lib/call-filters';
import { buildChartData } from '@/lib/stats';
import type { CallLog } from '@/lib/api';

const call = (over: Partial<CallLog>): CallLog => ({
  id: Math.random().toString(36),
  direction: 'outbound',
  phone_number: '11999990000',
  status: 'completed',
  source: 'microsip',
  bitrix_call_id: null,
  bitrix_user_id: null,
  crm_entity_type: null,
  crm_entity_id: null,
  duration_seconds: 0,
  recording_file: null,
  recording_status: null,
  error: null,
  call_started_at: '2026-10-14T12:00:00.000Z',
  call_answered_at: null,
  call_ended_at: null,
  ...over,
});

describe('formatClock', () => {
  it('formats mm:ss and h:mm:ss', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(75)).toBe('1:15');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(formatClock(-3)).toBe('0:00');
  });
});

describe('formatDuration', () => {
  it('uses the largest sensible units', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(185)).toBe('3min 05s');
    expect(formatDuration(7800)).toBe('2h 10min');
  });
});

describe('filterCalls', () => {
  const calls = [
    call({ direction: 'inbound', status: 'missed', phone_number: '+55 (11) 98888-7777' }),
    call({ direction: 'outbound', status: 'completed', phone_number: '21 3333-4444' }),
  ];

  it('filters by direction and status', () => {
    expect(filterCalls(calls, 'inbound', 'all', '')).toHaveLength(1);
    expect(filterCalls(calls, 'all', 'completed', '')).toHaveLength(1);
    expect(filterCalls(calls, 'outbound', 'missed', '')).toHaveLength(0);
  });

  it('matches numbers ignoring formatting', () => {
    expect(filterCalls(calls, 'all', 'all', '98888-77')[0].direction).toBe('inbound');
    expect(filterCalls(calls, 'all', 'all', '(21) 3333')[0].direction).toBe('outbound');
  });
});

describe('buildChartData', () => {
  it('fills missing days with zeros, oldest first', () => {
    const now = Date.parse('2026-10-14T15:00:00Z');
    const data = buildChartData([{ day: '2026-10-13', inbound: 2, outbound: 1 }], 3, now);
    expect(data.map((d) => d.day)).toEqual(['2026-10-12', '2026-10-13', '2026-10-14']);
    expect(data[1]).toMatchObject({ inbound: 2, outbound: 1 });
    expect(data[2]).toMatchObject({ inbound: 0, outbound: 0 });
  });
});
