import { useEffect, useState } from 'react';
import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { api } from '../api';

export function useBookingLink() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/me/booking-link')
      .then((data) => setUrl(data.url))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function copy() {
    await Clipboard.setStringAsync(url);
    setMessage('Link copiado');
  }

  async function share() {
    await Share.share({
      message: `Reservá tu turno acá: ${url}`,
      url,
    });
  }

  return { url, loading, message, error, copy, share };
}
