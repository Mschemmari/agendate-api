import { useEffect, useState } from 'react';
import { api } from '../api';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function emptyWeek() {
  return [1, 2, 3, 4, 5].map((dayOfWeek) => ({
    dayOfWeek,
    startTime: '09:00',
    endTime: '18:00',
    enabled: true,
  }));
}

function rulesFromApi(data) {
  if (!data.length) return emptyWeek();
  const byDay = new Map(data.map((r) => [r.dayOfWeek, r]));
  return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
    const existing = byDay.get(dayOfWeek);
    return existing
      ? {
          dayOfWeek,
          startTime: existing.startTime,
          endTime: existing.endTime,
          enabled: true,
        }
      : {
          dayOfWeek,
          startTime: '09:00',
          endTime: '18:00',
          enabled: false,
        };
  });
}

export function useAvailability({ onSaved } = {}) {
  const [rules, setRules] = useState(emptyWeek);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await api('/me/availability');
        setRules(rulesFromApi(data));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
        .map(({ dayOfWeek, startTime, endTime }) => ({
          dayOfWeek,
          startTime,
          endTime,
        }));
      await api('/me/availability', {
        method: 'PUT',
        body: { rules: payload },
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
    rules,
    loading,
    saving,
    error,
    ok,
    updateRule,
    save,
  };
}
