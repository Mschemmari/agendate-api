import { useEffect, useState } from 'react';
import { Linking, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { api } from '../api';
import { WEB_URL } from '../api/config';
import { whatsappUrl } from '../utils/phone';

function productionUrl(slug, apiUrl) {
  const base = WEB_URL.replace(/\/$/, '');
  if (slug) return `${base}/u/${slug}`;
  if (apiUrl && !/localhost|127\.0\.0\.1/.test(apiUrl)) return apiUrl;
  return '';
}

export function useBookingLink() {
  const [url, setUrl] = useState('');
  const [whatsappDeepLink, setWhatsappDeepLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/me/booking-link')
      .then((data) => {
        const next = productionUrl(data.slug, data.url);
        setUrl(next);
        setWhatsappDeepLink(data.whatsappUrl || '');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function flash(text) {
    setMessage(text);
    setTimeout(() => setMessage(''), 2500);
  }

  async function copy() {
    if (!url) return;
    await Clipboard.setStringAsync(url);
    flash('Link copiado');
  }

  async function share() {
    if (!url) return;
    await Share.share({
      message: `Reservá tu turno acá: ${url}`,
      url,
    });
  }

  /** Comparte el chat del bot con mensaje ya cargado para el cliente. */
  async function shareWhatsApp() {
    const deepLink = whatsappDeepLink;
    const shareText = deepLink
      ? `Hola! Para sacar un turno tocá este link y enviá el mensaje:\n${deepLink}`
      : url
        ? `Hola! Reservá tu turno acá: ${url}`
        : null;

    if (!shareText) return;

    const wa = whatsappUrl(null, shareText);
    const can = await Linking.canOpenURL(wa);
    if (!can) {
      await Share.share({ message: shareText });
      return;
    }
    await Linking.openURL(wa);
  }

  return {
    url,
    whatsappDeepLink,
    loading,
    message,
    error,
    copy,
    share,
    shareWhatsApp,
  };
}
