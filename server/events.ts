import * as bitrix from './bitrix';
import { getSetting, logEvent } from './db';
import { bus } from './bus';
import { isForThisPc, startOutboundFromBitrix, type ExternalCallStart } from './calls';

/**
 * Bitrix24 cannot reach localhost, so instead of online event handlers we use
 * offline events: Bitrix24 queues them and we poll the queue.
 *
 * Several PCs (one per agent) may share the same portal queue. Each PC reads the
 * queue without consuming it (event.offline.list) and only removes the events
 * addressed to its own Bitrix24 user (event.offline.get filtered by ID).
 * Stale events whose PC never showed up are swept so the queue does not grow.
 */

export const CALL_EVENTS = ['ONEXTERNALCALLSTART', 'ONEXTERNALCALLBACKSTART'] as const;

const POLL_MS = Number(process.env.VOIPSIP_POLL_MS || 2000);
const STALE_MS = 5 * 60_000;

interface CallEventData {
  PHONE_NUMBER?: string;
  USER_ID?: string | number;
  CALL_ID?: string;
  CRM_ENTITY_TYPE?: string;
  CRM_ENTITY_ID?: string;
  data?: CallEventData;
}

interface OfflineEvent {
  ID: string;
  TIMESTAMP_X: string;
  EVENT_NAME: string;
  EVENT_DATA: CallEventData | false;
  MESSAGE_ID: string;
}

export const pollerState = {
  running: false,
  lastPollAt: null as string | null,
  lastError: null as string | null,
  lastEventAt: null as string | null,
};

/** Called at install time and from settings: (re)subscribe to the call events. */
export async function bindCallEvents(): Promise<Record<string, unknown>> {
  const results: Record<string, unknown> = {};
  for (const event of CALL_EVENTS) {
    try {
      results[event] = await bitrix.call('event.bind', { event, event_type: 'offline' });
    } catch (err) {
      // Already bound is fine.
      results[event] = (err as Error).message;
    }
  }
  logEvent('bitrix', 'events_bound', results);
  return results;
}

/** EVENT_DATA shape for telephony offline events is not documented; accept both flat and {data: {...}}. */
function eventData(ev: OfflineEvent): CallEventData {
  const raw = ev.EVENT_DATA || {};
  return raw.data && typeof raw.data === 'object' ? raw.data : raw;
}

async function takeEvent(id: string): Promise<OfflineEvent | null> {
  const res = await bitrix.call<{ events: OfflineEvent[] }>('event.offline.get', { filter: { '=ID': id }, clear: 1 });
  return res?.events?.[0] ?? null;
}

async function handle(event: OfflineEvent): Promise<void> {
  const data = eventData(event);
  logEvent('bitrix', event.EVENT_NAME, event);
  pollerState.lastEventAt = new Date().toISOString();

  if (event.EVENT_NAME === 'ONEXTERNALCALLSTART' || event.EVENT_NAME === 'ONEXTERNALCALLBACKSTART') {
    if (!data.PHONE_NUMBER) {
      logEvent('bitrix', 'event_without_phone', event);
      return;
    }
    startOutboundFromBitrix(data as ExternalCallStart);
  }
}

async function pollOnce(): Promise<void> {
  const queue = await bitrix.call<OfflineEvent[]>('event.offline.list', {
    filter: { EVENT_NAME: [...CALL_EVENTS], ERROR: 0 },
    order: { ID: 'ASC' },
  });

  for (const ev of queue ?? []) {
    const data = eventData(ev);
    const stale = Date.now() - Date.parse(ev.TIMESTAMP_X) > STALE_MS;
    if (isForThisPc(data)) {
      const taken = await takeEvent(ev.ID);
      // Another PC (same user logged on twice) may have won the race.
      if (taken && !stale) await handle(taken);
    } else if (stale) {
      await takeEvent(ev.ID);
      logEvent('bitrix', 'stale_event_dropped', { id: ev.ID, user: data.USER_ID });
    }
  }
}

let timer: NodeJS.Timeout | null = null;

export function startPoller(): void {
  if (timer) return;
  pollerState.running = true;
  const tick = async () => {
    if (bitrix.isConnected() && getSetting('events.enabled') !== '0') {
      try {
        await pollOnce();
        pollerState.lastError = null;
      } catch (err) {
        const message = (err as Error).message;
        if (message !== pollerState.lastError) {
          logEvent('bitrix', 'poll_failed', { error: message });
          bus.emit({ type: 'status' });
        }
        pollerState.lastError = message;
      }
      pollerState.lastPollAt = new Date().toISOString();
    }
    timer = setTimeout(tick, POLL_MS);
  };
  void tick();
}

export function stopPoller(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  pollerState.running = false;
}
