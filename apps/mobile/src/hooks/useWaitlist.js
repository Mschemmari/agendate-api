import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { whatsappUrl } from '../utils/phone';

export function useWaitlist() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api('/me/waitlist');
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      setEntries([]);
      // 404 = API de producción todavía sin este endpoint
      if (!/404|no encontrado|not found/i.test(err.message || '')) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  function contactWhatsApp(entry) {
    const text = entry.status === 'offered'
      ? `Hola ${entry.name}! Se liberó un lugar. Podés reservar cuando quieras.`
      : `Hola ${entry.name}! Te escribo por tu lugar en la lista de espera.`;
    const wa = whatsappUrl(entry.phone, text);
    if (!wa) {
      Alert.alert('Sin teléfono', 'Esa persona no tiene teléfono cargado.');
      return;
    }
    Linking.openURL(wa);
  }

  function remove(entry) {
    Alert.alert(
      'Quitar de la lista',
      `¿Sacar a ${entry.name} de la lista de espera?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api(`/me/waitlist/${entry.id}/cancel`, { method: 'PATCH' });
              await load();
            } catch (err) {
              setError(err.message);
            }
          },
        },
      ]
    );
  }

  return { entries, loading, error, load, contactWhatsApp, remove };
}
