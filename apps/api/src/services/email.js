const { Resend } = require('resend');
const { buildGoogleCalendarUrl, buildIcs } = require('@agendate/shared');

function formatWhen(date) {
  return new Date(date).toLocaleString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function sendAppointmentConfirmation({
  patient,
  professional,
  appointment,
}) {
  const title = `Turno con ${professional.name}`;
  const details = `Turno confirmado con ${professional.name}.`;
  const googleUrl = buildGoogleCalendarUrl({
    title,
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    details,
  });
  const ics = buildIcs({
    title,
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    description: details,
    uid: `${appointment._id}@agendate`,
  });

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
      <h2>Turno confirmado</h2>
      <p>Hola ${patient.name},</p>
      <p>Tu turno con <strong>${professional.name}</strong> quedó agendado:</p>
      <p><strong>${formatWhen(appointment.startsAt)}</strong></p>
      <p>
        <a href="${googleUrl}" style="display:inline-block;background:#1a73e8;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">
          Agregar a Google Calendar
        </a>
      </p>
      <p style="color:#666;font-size:14px">También podés abrir el archivo .ics adjunto.</p>
    </div>
  `;

  const from = process.env.EMAIL_FROM || 'Turnia <onboarding@resend.dev>';
  const payload = {
    from,
    to: patient.email,
    subject: `Turno confirmado — ${professional.name}`,
    html,
    attachments: [
      {
        filename: 'turno.ics',
        content: Buffer.from(ics).toString('base64'),
      },
    ],
  };

  if (!process.env.RESEND_API_KEY) {
    console.log('[email:dev] Confirmation email (not sent — no RESEND_API_KEY)');
    console.log('  to:', patient.email);
    console.log('  googleCalendar:', googleUrl);
    return { googleUrl, ics, sent: false };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send(payload);
  return { googleUrl, ics, sent: true };
}

async function sendAppointmentCancellation({ patient, professional, appointment }) {
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
      <h2>Turno cancelado</h2>
      <p>Hola ${patient.name},</p>
      <p>Tu turno con <strong>${professional.name}</strong> del
      <strong>${formatWhen(appointment.startsAt)}</strong> fue cancelado.</p>
    </div>
  `;

  if (!process.env.RESEND_API_KEY) {
    console.log('[email:dev] Cancellation email (not sent)');
    console.log('  to:', patient.email);
    return { sent: false };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'Turnia <onboarding@resend.dev>',
    to: patient.email,
    subject: `Turno cancelado — ${professional.name}`,
    html,
  });
  return { sent: true };
}

module.exports = {
  sendAppointmentConfirmation,
  sendAppointmentCancellation,
};
