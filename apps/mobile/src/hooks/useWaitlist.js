import { useCallback, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { whatsappUrl } from '../utils/phone';
import { getCached, invalidateCache, setCached } from '../utils/cache';

const CACHE_KEY = 'waitlist';
const TTL_MS = 60_000;

export function useWaitlist() {
  const cached = getCached(CACHE_KEY, TTL_MS);
  const [entries, setEntries] = useState(() => cached || []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState('');
  const fetching = useRef(false);

  const load = useCallback(async ({ force = false } = {}) => {
    if (!force) {
      const hit = getCached(CACHE_KEY, TTL_MS);
      if (hit) {
        setEntries(hit);
        setLoading(false);
        return;
      }
    }
    if (fetching.current) return;
    fetching.current = true;
    setError('');
    try {
      const data = await api('/me/waitlist');
      const list = Array.isArray(data) ? data : [];
      setEntries(list);
      setCached(CACHE_KEY, list);
    } catch (err) {
      setEntries([]);
      invalidateCache(CACHE_KEY);
      if (!/404|no encontrado|not found/i.test(err.message || '')) {
        setError(err.message);
      }
    } finally {
      fetching.current = false;
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const hit = getCached(CACHE_KEY, TTL_MS);
      if (hit) {
        setEntries(hit);
        setLoading(false);
        return undefined;
      }
      setLoading(true);
      load({ force: true });
      return undefined;
    }, [load])
  );

  function contactWhatsApp(entry) {
    const text =
      entry.status === 'offered'
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
              invalidateCache(CACHE_KEY);
              await load({ force: true });
            } catch (err) {
              setError(err.message);
            }
          },
        },
      ]
    );
  }

  return {
    entries,
    loading,
    error,
    load: () => load({ force: true }),
    contactWhatsApp,
    remove,
  };
}
