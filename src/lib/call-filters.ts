import type { CallDirection, CallLog, CallStatus } from '@/lib/api';

export type DirectionFilter = 'all' | CallDirection;
export type StatusFilter = 'all' | CallStatus;

export const onlyDigits = (value: string) => value.replace(/\D/g, '');

/** Filters by direction, status and a partial phone number (digits only, formatting ignored). */
export function filterCalls(calls: CallLog[], direction: DirectionFilter, status: StatusFilter, search: string): CallLog[] {
  const needle = onlyDigits(search);
  return calls.filter(
    (c) =>
      (direction === 'all' || c.direction === direction) &&
      (status === 'all' || c.status === status) &&
      (!needle || onlyDigits(c.phone_number).includes(needle)),
  );
}
