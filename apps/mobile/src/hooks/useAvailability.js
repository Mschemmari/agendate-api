import { useEffect, useState } from 'react';
import { api } from '../api';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function emptyWeek(sessionMode = 'individual') {
  const capacity = sessionMode === 'group' ? '20' : '1';
  return [1, 2, 3, 4, 5].map((dayOfWeek) => ({
    dayOfWeek,
    startTime: '09:00',
    endTime: '18:00',
    capacity,
    enabled: true,
  }));
}

function rulesFromApi(data, sessionMode) {
  if (!data.length) return emptyWeek(sessionMode);
  const byDay = new Map(data.map((r) => [r.dayOfWeek, r]));
  return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
    const existing = byDay.get(dayOfWeek);
    return existing
      ? {
          dayOfWeek,
          startTime: existing.startTime,
          endTime: existing.endTime,
          capacity: String(existing.capacity ?? (sessionMode === 'group' ? 20 : 1)),
          enabled: true,
        }
      : {
          dayOfWeek,
          startTime: '09:00',
          endTime: '18:00',
          capacity: sessionMode === 'group' ? '20' : '1',
          enabled: false,
        };
  });
}

export function useAvailability({ onSaved } = {}) {
  const [sessionMode, setSessionMode] = useState('individual');
  const [rules, setRules] = useState(() => emptyWeek('individual'));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await api('/me/availability');
        const mode =
          data?.sessionMode === 'group' ? 'group' : 'individual';
        const list = Array.isArray(data) ? data : data?.rules || [];
        setSessionMode(mode);
        setRules(rulesFromApi(list, mode));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function setMode(mode) {
    const next = mode === 'group' ? 'group' : 'individual';
    setSessionMode(next);
    setRules((prev) =>
      prev.map((r) => ({
        ...r,
        capacity:
          next === 'group'
            ? r.capacity && Number(r.capacity) > 1
              ? r.capacity
              : '20'
            : '1',
      }))
    );
  }

  function updateRule(dayOfWeek, patch) {
    setRules((prev) =>
      prev.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, ...patch } : r))
    );
  }

  async function save() {
    setSaving(true);
    setError('');
    setOk('');
    try {
      const payload = rules
        .filter((r) => r.enabled)
        .map(({ dayOfWeek, startTime, endTime, capacity }) => ({
          dayOfWeek,
          startTime,
          endTime,
          capacity: Number(capacity) || (sessionMode === 'group' ? 20 : 1),
        }));

      if (sessionMode === 'group') {
        const invalid = payload.find(
          (r) => !Number.isFinite(r.capacity) || r.capacity < 1
        );
        if (invalid) {
          throw new Error('El cupo debe ser al menos 1');
        }
      }

      await api('/me/availability', {
        method: 'PUT',
        body: { sessionMode, rules: payload },
      });
      setOk('Horarios guardados');
      setTimeout(() => onSaved?.(), 600);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return {
    DAYS,
    sessionMode,
    setMode,
    rules,
    loading,
    saving,
    error,
    ok,
    updateRule,
    save,
  };
}
