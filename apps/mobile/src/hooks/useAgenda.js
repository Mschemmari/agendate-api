import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import {
  cancelAppointmentReminder,
  onAppointmentsChanged,
  syncUpcomingReminders,
} from '../notifications';
import {
  addDays,
  buildMonthGrid,
  daysInMonth,
  formatDayTitle,
  formatMonthTitle,
  sameDay,
  startOfDay,
  startOfMonth,
} from '../utils/date';

export function useAgenda() {
  const [viewMode, setViewMode] = useState('month');
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()));
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const loadRef = useRef(null);

  const monthCells = useMemo(() => buildMonthGrid(monthAnchor), [monthAnchor]);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setError('');
    try {
      const from =
        viewMode === 'day'
          ? addDays(selectedDay, -3)
          : addDays(startOfMonth(monthAnchor), -7);
      const to =
        viewMode === 'day'
          ? addDays(selectedDay, 10)
          : addDays(startOfMonth(monthAnchor), 45);
      to.setHours(23, 59, 59, 999);
      const data = await api(
        `/me/appointments?from=${from.toISOString()}&to=${to.toISOString()}`
      );
      setItems(data.filter((a) => a.status === 'confirmed'));
      syncUpcomingReminders();
      if (silent) setError('');
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [viewMode, selectedDay, monthAnchor]);

  loadRef.current = load;

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();

      const unsubChanged = onAppointmentsChanged(() => {
        loadRef.current?.({ silent: true });
      });

      const onAppState = (state) => {
        if (state === 'active') {
          loadRef.current?.({ silent: true });
        }
      };
      const sub = AppState.addEventListener('change', onAppState);

      return () => {
        unsubChanged();
        sub.remove();
      };
    }, [load])
  );

  const dayAppointments = useMemo(
    () =>
      items
        .filter((a) => sameDay(new Date(a.startsAt), selectedDay))
        .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)),
    [items, selectedDay]
  );

  const countByDayKey = useMemo(() => {
    const map = {};
    for (const a of items) {
      const key = startOfDay(new Date(a.startsAt)).toISOString();
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [items]);

  const titleDate =
    viewMode === 'month'
      ? formatMonthTitle(monthAnchor)
      : formatDayTitle(selectedDay);

  function goToday() {
    const today = startOfDay(new Date());
    setSelectedDay(today);
    setMonthAnchor(startOfMonth(today));
  }

  function shiftPeriod(delta) {
    if (viewMode === 'day') {
      const next = addDays(selectedDay, delta);
      setSelectedDay(next);
      setMonthAnchor(startOfMonth(next));
      return;
    }
    const next = new Date(
      monthAnchor.getFullYear(),
      monthAnchor.getMonth() + delta,
      1
    );
    setMonthAnchor(next);
    setSelectedDay(
      startOfDay(
        new Date(
          next.getFullYear(),
          next.getMonth(),
          Math.min(selectedDay.getDate(), daysInMonth(next))
        )
      )
    );
  }

  function selectDay(day) {
    const d = startOfDay(day);
    setSelectedDay(d);
    setMonthAnchor(startOfMonth(d));
  }

  function switchMode(mode) {
    setViewMode(mode);
    if (mode === 'month') setMonthAnchor(startOfMonth(selectedDay));
  }

  function refresh() {
    setRefreshing(true);
    load();
  }

  function cancelAppt(item) {
    Alert.alert(
      'Cancelar turno',
      `¿Cancelar el turno de ${item.patient?.name || 'paciente'}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Cancelar turno',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await api(`/me/appointments/${item.id}/cancel`, {
                method: 'PATCH',
              });
              await cancelAppointmentReminder(item.id);
              await load();
              const offer = result.waitlistOffer;
              if (offer?.name) {
                Alert.alert(
                  'Lista de espera',
                  `Se liberó un lugar. Avisamos automáticamente a ${offer.name} (1º en la lista).`,
                  [{ text: 'OK' }]
                );
              }
            } catch (err) {
              setError(err.message);
            }
          },
        },
      ]
    );
  }

  return {
    viewMode,
    selectedDay,
    monthAnchor,
    monthCells,
    items,
    dayAppointments,
    countByDayKey,
    loading,
    refreshing,
    error,
    titleDate,
    goToday,
    shiftPeriod,
    selectDay,
    switchMode,
    refresh,
    cancelAppt,
  };
}
