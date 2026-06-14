/**
 * Recurring-availability matching. Pure time arithmetic.
 *
 * Availability slots are stored as Lebanon local wall-clock TIME (see
 * migrations/init.sql). Booking timestamps arrive as absolute instants (ISO with offset/Z), so we
 * must convert them to Lebanon local time before comparing — doing this via the
 * IANA zone keeps it correct across the country's DST switch (UTC+2 ↔ UTC+3)
 * rather than assuming a fixed offset. Availability is a soft signal (small weight,
 * neutral when unknown), but it should still score the right day/hour.
 */

import type { AvailabilitySlot } from './types';

const TIME_ZONE = 'Asia/Beirut';

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

// One shared formatter (constructing Intl.DateTimeFormat is relatively costly).
const localParts = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  weekday: 'short',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

interface LocalMoment {
  dateKey: string; // 'YYYY-MM-DD' in Lebanon local time
  dayOfWeek: number; // 0..6
  minutes: number; // minutes from local midnight
}

const toLocalMoment = (d: Date): LocalMoment => {
  const parts: Record<string, string> = {};
  for (const part of localParts.formatToParts(d)) {
    if (part.type !== 'literal') {
      parts[part.type] = part.value;
    }
  }
  // 'en-US' with hour12:false can emit '24' for midnight; normalize to 0.
  const hour = parts.hour === '24' ? 0 : Number(parts.hour);
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    dayOfWeek: WEEKDAY_INDEX[parts.weekday] ?? 0,
    minutes: hour * 60 + Number(parts.minute),
  };
};

/**
 * True when the requested [from, to) window fits entirely inside one of the
 * sitter's recurring weekly slots. Windows that span more than one local calendar
 * day are treated as not covered (v1 supports same-day bookings only).
 */
export const isWindowCovered = (
  slots: readonly AvailabilitySlot[],
  from: Date,
  to: Date,
): boolean => {
  const start = toLocalMoment(from);
  const end = toLocalMoment(to);
  if (start.dateKey !== end.dateKey) {
    return false;
  }
  return slots.some(
    (slot) =>
      slot.dayOfWeek === start.dayOfWeek &&
      slot.startMinutes <= start.minutes &&
      slot.endMinutes >= end.minutes,
  );
};
