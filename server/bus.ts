import { EventEmitter } from 'node:events';

/** In-process pub/sub that feeds the UI's Server-Sent Events stream. */
export type UiEvent =
  | { type: 'dial'; callId: string; number: string; mode: string }
  | { type: 'call_updated'; callId: string }
  | { type: 'status' };

const emitter = new EventEmitter();
emitter.setMaxListeners(50);

export const bus = {
  emit(event: UiEvent) {
    emitter.emit('ui', event);
  },
  subscribe(listener: (event: UiEvent) => void) {
    emitter.on('ui', listener);
    return () => {
      emitter.off('ui', listener);
    };
  },
};
