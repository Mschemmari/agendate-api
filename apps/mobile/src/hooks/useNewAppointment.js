import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { scheduleAppointmentReminder } from '../notifications';
import { mergeDatePart, mergeTimePart, nextHalfHour } from '../utils/datetime';
import { getCached, invalidateCache, setCached } from '../utils/cache';

const PATIENTS_KEY = 'patients';
const TTL_MS = 60_000;

export function useNewAppointment({ onCreated } = {}) {
  const cached = getCached(PATIENTS_KEY, TTL_MS);
  const [patients, setPatients] = useState(() => cached || []);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [when, setWhen] = useState(nextHalfHour);
  const [iosPicker, setIosPicker] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fetching = useRef(false);

  const loadPatients = useCallback(async ({ force = false } = {}) => {
    if (!force) {
      const hit = getCached(PATIENTS_KEY, TTL_MS);
      if (hit) {
        setPatients(hit);
        return;
      }
    }
    if (fetching.current) return;
    fetching.current = true;
    try {
      const data = await api('/me/patients');
      setPatients(data);
      setCached(PATIENTS_KEY, data);
    } catch (err) {
      setError(err.message);
    } finally {
      fetching.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPatients();
    }, [loadPatients])
  );

  function fillFromPatient(patient) {
    setName(patient.name || '');
    setEmail(patient.email || '');
    setPhone(patient.phone || '');
  }

  function openPicker(mode) {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: when,
        mode,
        is24Hour: true,
        minuteInterval: 15,
        minimumDate: mode === 'date' ? new Date() : undefined,
        onValueChange: (_event, selected) => {
          if (!selected) return;
          setWhen((current) =>
            mode === 'date'
              ? mergeDatePart(current, selected)
              : mergeTimePart(current, selected)
          );
        },
      });
      return;
    }
    setIosPicker(mode);
  }

  function onIosPickerChange(selected) {
    if (!selected || !iosPicker) return;
    setWhen((current) =>
      iosPicker === 'date'
        ? mergeDatePart(current, selected)
        : mergeTimePart(current, selected)
    );
  }

  async function submit() {
    setLoading(true);
    setError('');
    try {
      if (!name.trim() || !email.trim()) {
        throw new Error('Completá nombre y email');
      }
      if (!(when instanceof Date) || Number.isNaN(when.getTime())) {
        throw new Error('Elegí fecha y hora');
      }
      if (when <= new Date()) {
        throw new Error('El turno tiene que ser en el futuro');
      }

      const created = await api('/me/appointments', {
        method: 'POST',
        body: {
          startsAt: when.toISOString(),
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
        },
      });
      await scheduleAppointmentReminder(created);
      setName('');
      setEmail('');
      setPhone('');
      setWhen(nextHalfHour());
      invalidateCache(PATIENTS_KEY);
      await loadPatients({ force: true });
      onCreated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return {
    patients,
    name,
    setName,
    email,
    setEmail,
    phone,
    setPhone,
    when,
    iosPicker,
    setIosPicker,
    error,
    loading,
    fillFromPatient,
    openPicker,
    onIosPickerChange,
    submit,
  };
}
