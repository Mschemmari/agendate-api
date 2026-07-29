function parseTimeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToDate(day, minutes) {
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutes);
  return d;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Generate available slots between from/to dates.
 * availabilityRules: [{ dayOfWeek, startTime, endTime }]
 * appointments: [{ startsAt, endsAt }] (confirmed only)
 * durationMinutes: number
 */
function generateSlots({
  from,
  to,
  availabilityRules,
  appointments,
  durationMinutes,
  now = new Date(),
}) {
  const slots = [];
  const startDay = new Date(from);
  startDay.setHours(0, 0, 0, 0);
  const endDay = new Date(to);
  endDay.setHours(23, 59, 59, 999);

  for (
    let day = new Date(startDay);
    day <= endDay;
    day.setDate(day.getDate() + 1)
  ) {
    const dow = day.getDay();
    const rules = availabilityRules.filter((r) => r.dayOfWeek === dow);

    for (const rule of rules) {
      const startMin = parseTimeToMinutes(rule.startTime);
      const endMin = parseTimeToMinutes(rule.endTime);

      for (let m = startMin; m + durationMinutes <= endMin; m += durationMinutes) {
        const slotStart = minutesToDate(day, m);
        const slotEnd = minutesToDate(day, m + durationMinutes);

        if (slotStart <= now) continue;

        const busy = appointments.some((a) =>
          overlaps(slotStart, slotEnd, new Date(a.startsAt), new Date(a.endsAt))
        );
        if (busy) continue;

        slots.push({
          startsAt: slotStart.toISOString(),
          endsAt: slotEnd.toISOString(),
        });
      }
    }
  }

  return slots;
}

function toGoogleCalendarDate(date) {
  return new Date(date)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function buildGoogleCalendarUrl({ title, startsAt, endsAt, details = '', location = '' }) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${toGoogleCalendarDate(startsAt)}/${toGoogleCalendarDate(endsAt)}`,
    details,
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function formatIcsDate(date) {
  return new Date(date)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function escapeIcs(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function buildIcs({ title, startsAt, endsAt, description = '', uid }) {
  const id = uid || `${Date.now()}@agendate`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Agendate//Turnos//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${id}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(startsAt)}`,
    `DTEND:${formatIcsDate(endsAt)}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

module.exports = {
  generateSlots,
  buildGoogleCalendarUrl,
  buildIcs,
  overlaps,
  slugify,
  parseTimeToMinutes,
};
