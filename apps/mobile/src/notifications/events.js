const listeners = new Set();

export function onAppointmentsChanged(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitAppointmentsChanged() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore listener errors
    }
  });
}
