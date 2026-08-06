const GRAPH_URL = 'https://graph.facebook.com/v21.0';

function isConfigured() {
  return Boolean(
    process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
  );
}

/** Digits only. */
function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

/**
 * Meta's test allow-list often stores AR mobiles with the old "15" local prefix
 * (54115…) while WhatsApp webhooks send wa_id with the "9" (54911…).
 * Convert 549 + area + subscriber → 54 + area + 15 + subscriber.
 */
function argentinaAllowListVariant(waId) {
  const n = digits(waId);
  // 54 + 9 + 2–4 digit area + subscriber (total typically 12–13 digits after 54)
  const m = n.match(/^549(\d{2,4})(\d{6,8})$/);
  if (!m) return null;
  const [, area, subscriber] = m;
  return `54${area}15${subscriber}`;
}

function recipientCandidates(to) {
  const primary = digits(to);
  const alt = argentinaAllowListVariant(primary);
  if (alt && alt !== primary) return [primary, alt];
  return [primary];
}

async function postText(phoneNumberId, to, body) {
  const res = await fetch(`${GRAPH_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { preview_url: false, body },
    }),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function sendText(to, body) {
  if (!isConfigured()) {
    console.log('[whatsapp:dry-run]', { to, body });
    return { dryRun: true };
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const candidates = recipientCandidates(to);
  let lastData = {};
  let lastStatus = 500;

  for (const recipient of candidates) {
    const { res, data } = await postText(phoneNumberId, recipient, body);
    lastData = data;
    lastStatus = res.status;
    if (res.ok) {
      if (recipient !== candidates[0]) {
        console.log('[whatsapp] sent using AR allow-list variant', recipient);
      }
      return data;
    }
    const code = data?.error?.code;
    console.error('[whatsapp] send failed', res.status, data);
    // Only retry alternate format on allow-list miss.
    if (code !== 131030) break;
  }

  const err = new Error(lastData?.error?.message || 'Error enviando WhatsApp');
  err.status = 502;
  throw err;
}

module.exports = {
  isConfigured,
  sendText,
  argentinaAllowListVariant,
  recipientCandidates,
};
