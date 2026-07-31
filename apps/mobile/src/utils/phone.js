/** Digits only for wa.me; keeps country code if present. */
export function digitsOnly(phone) {
  return String(phone || '').replace(/\D/g, '');
}

export function whatsappUrl(phone, text) {
  const digits = phone ? digitsOnly(phone) : '';
  const base = digits ? `https://wa.me/${digits}` : 'https://wa.me/';
  if (!text) return digits ? base : null;
  return `${base}?text=${encodeURIComponent(text)}`;
}
