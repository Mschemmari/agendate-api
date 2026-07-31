const GRAPH_URL = 'https://graph.facebook.com/v21.0';

function isConfigured() {
  return Boolean(
    process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
  );
}

async function sendText(to, body) {
  if (!isConfigured()) {
    console.log('[whatsapp:dry-run]', { to, body });
    return { dryRun: true };
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const res = await fetch(`${GRAPH_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: String(to).replace(/\D/g, ''),
      type: 'text',
      text: { preview_url: false, body },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[whatsapp] send failed', res.status, data);
    const err = new Error(data?.error?.message || 'Error enviando WhatsApp');
    err.status = 502;
    throw err;
  }
  return data;
}

module.exports = {
  isConfigured,
  sendText,
};
