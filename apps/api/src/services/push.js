const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function formatWhen(startsAt) {
  const date = new Date(startsAt);
  return date.toLocaleString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function sendExpoPush(messages) {
  const list = Array.isArray(messages) ? messages : [messages];
  if (list.length === 0) return { data: [] };

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(list),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[push] Expo push failed', res.status, payload);
  }
  return payload;
}

function isExpoPushToken(token) {
  return (
    typeof token === 'string' &&
    (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['))
  );
}

async function notifyNewAppointment({ professional, patient, appointment }) {
  const tokens = (professional.expoPushTokens || []).filter(isExpoPushToken);
  if (tokens.length === 0) return;

  const title =
    appointment.source === 'link' ? 'Nueva reserva' : 'Nuevo turno';
  const body = `${patient?.name || 'Paciente'} · ${formatWhen(appointment.startsAt)}`;

  try {
    await sendExpoPush(
      tokens.map((to) => ({
        to,
        sound: 'default',
        title,
        body,
        data: {
          type: 'new-appointment',
          appointmentId: String(appointment._id),
        },
        channelId: 'new-appointments',
      }))
    );
  } catch (err) {
    console.error('[push] notifyNewAppointment error', err.message);
  }
}

module.exports = {
  sendExpoPush,
  notifyNewAppointment,
  isExpoPushToken,
};
