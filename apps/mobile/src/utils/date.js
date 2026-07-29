export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfWeek(date) {
  const d = startOfDay(date);
  return addDays(d, -d.getDay());
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function minutesFromDayStart(date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function capitalize(label) {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatMonthTitle(date) {
  return capitalize(
    date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  );
}

export function formatDayTitle(date) {
  return capitalize(
    date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  );
}

export function formatDateLabel(date) {
  return date.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatHour(h) {
  return `${String(h).padStart(2, '0')}:00`;
}

export function formatTime(value) {
  return new Date(value).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function buildMonthGrid(monthDate) {
  const first = startOfMonth(monthDate);
  const start = startOfWeek(first);
  const totalDays = daysInMonth(monthDate);
  const end = startOfWeek(
    new Date(monthDate.getFullYear(), monthDate.getMonth(), totalDays)
  );
  const last = addDays(end, 6);
  const cells = [];
  for (let d = new Date(start); d <= last; d = addDays(d, 1)) {
    cells.push(startOfDay(d));
  }
  return cells;
}

export function eventBlockStyle(appt, hourStart, hourHeight) {
  const start = new Date(appt.startsAt);
  const end = new Date(appt.endsAt);
  const startMin = minutesFromDayStart(start) - hourStart * 60;
  const endMin = minutesFromDayStart(end) - hourStart * 60;
  const top = (startMin / 60) * hourHeight;
  const height = Math.max(((endMin - startMin) / 60) * hourHeight - 3, 28);
  return { top, height };
}
