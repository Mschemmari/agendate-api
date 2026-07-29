import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { scheduleAppointmentReminder } from '../notifications';
import { mergeDatePart, mergeTimePart, nextHalfHour } from '../utils/datetime';

export function useNewAppointment({ onCreated } = {}) {
  const [patients, setPatients] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [when, setWhen] = useState(nextHalfHour);
  const [iosPicker, setIosPicker] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadPatients = useCallback(() => {
    api('/me/patients')
      .then(setPatients)
      .catch((err) => setError(err.message));
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
      loadPatients();
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
