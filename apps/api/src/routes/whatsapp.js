const express = require('express');
const crypto = require('crypto');
const { handleIncomingText } = require('../services/whatsappBot');

const router = express.Router();

function verifyMetaSignature(req) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true;
  const signature = req.headers['x-hub-signature-256'];
  if (!signature || !req.rawBody) return false;
  const expected =
    'sha256=' +
    crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

/** Meta webhook verification (GET). */
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'agendate-verify';

  if (mode === 'subscribe' && token === verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

/** Incoming messages (POST). */
router.post('/', async (req, res) => {
  // Always ack quickly so Meta doesn't retry.
  res.sendStatus(200);

  try {
    if (process.env.WHATSAPP_APP_SECRET && !verifyMetaSignature(req)) {
      console.warn('[whatsapp] invalid signature');
      return;
    }

    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages;
    const statuses = value?.statuses;
    console.log('[whatsapp] webhook POST', {
      field: change?.field,
      messages: messages?.length || 0,
      statuses: statuses?.length || 0,
      types: messages?.map((m) => m.type) || [],
      from: messages?.[0]?.from || null,
    });
    if (!messages?.length) return;

    for (const msg of messages) {
      if (msg.type !== 'text' || !msg.text?.body) continue;
      const waId = msg.from;
      const text = msg.text.body;
      handleIncomingText(waId, text).catch((err) => {
        console.error('[whatsapp] handler error', err.message);
      });
    }
  } catch (err) {
    console.error('[whatsapp] webhook error', err.message);
  }
});

module.exports = router;
