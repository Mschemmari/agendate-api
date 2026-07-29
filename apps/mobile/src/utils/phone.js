/** Digits only for wa.me; keeps country code if present. */
export function digitsOnly(phone) {
  return String(phone || '').replace(/\D/g, '');
}

export function whatsappUrl(phone) {
  const digits = digitsOnly(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}
