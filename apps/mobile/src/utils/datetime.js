export function nextHalfHour() {
  const d = new Date();
  d.setSeconds(0, 0);
  const minutes = d.getMinutes();
  const add = minutes === 0 ? 0 : 30 - (minutes % 30);
  d.setMinutes(minutes + add);
  if (add === 0) d.setMinutes(d.getMinutes() + 30);
  return d;
}

export function mergeDatePart(current, picked) {
  const next = new Date(current);
  next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
  return next;
}

export function mergeTimePart(current, picked) {
  const next = new Date(current);
  next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
  return next;
}
