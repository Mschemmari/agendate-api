const { generateSlots } = require('@agendate/shared');
const Professional = require('../models/Professional');
const AvailabilityRule = require('../models/AvailabilityRule');
const Appointment = require('../models/Appointment');
const WhatsAppSession = require('../models/WhatsAppSession');
const { createAppointment, getDefaultDuration } = require('./appointments');
const { joinWaitlist } = require('./waitlist');
const { sendText } = require('./whatsappClient');

function formatSlotLine(slot, index) {
  const start = new Date(slot.startsAt);
  const label = start.toLocaleString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const spots =
    slot.spotsLeft != null ? ` (${slot.spotsLeft} lugar${slot.spotsLeft === 1 ? '' : 'es'})` : '';
  return `${index + 1}) ${label}${spots}`;
}

async function loadSlotsForProfessional(professional, days = 14) {
  const from = new Date();
  const to = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const sessionMode =
    professional.sessionMode === 'group' ? 'group' : 'individual';

  const [rules, appointments, durationMinutes] = await Promise.all([
    AvailabilityRule.find({ professionalId: professional._id }),
    Appointment.find({
      professionalId: professional._id,
      status: 'confirmed',
      startsAt: { $lte: to },
      endsAt: { $gte: from },
    }),
    getDefaultDuration(professional._id),
  ]);

  const slots = generateSlots({
    from,
    to,
    availabilityRules: rules,
    appointments,
    durationMinutes,
    sessionMode,
  }).slice(0, 8);

  return { slots, sessionMode };
}

async function getOrCreateSession(waId) {
  let session = await WhatsAppSession.findOne({ waId });
  if (!session) {
    session = await WhatsAppSession.create({
      waId,
      step: 'need_slug',
      draft: {},
    });
  }
  return session;
}

async function resetSession(session) {
  session.professionalId = null;
  session.step = 'need_slug';
  session.draft = {};
  await session.save();
}

async function showSlotsMessage(professional, slots) {
  if (!slots.length) {
    return (
      `No hay turnos libres con ${professional.name} en los próximos días.\n\n` +
      `Respondé *lista* para anotarte en lista de espera, o *cambiar* para otro profesional.`
    );
  }
  const lines = slots.map((s, i) => formatSlotLine(s, i));
  return (
    `Turnos con *${professional.name}*:\n\n${lines.join('\n')}\n\n` +
    `Respondé el *número* del horario.\n` +
    `Si no te sirve ninguno: *lista* (espera) o *cambiar*.`
  );
}

async function handleIncomingText(waId, textRaw) {
  const text = String(textRaw || '').trim();
  const lower = text.toLowerCase();
  const session = await getOrCreateSession(waId);

  if (!text) {
    await sendText(waId, 'Escribime un mensaje para agendar tu turno.');
    return;
  }

  if (['hola', 'hi', 'buen día', 'buenas', 'hey', 'menu', 'inicio'].includes(lower)) {
    await resetSession(session);
    await sendText(
      waId,
      '¡Hola! Soy el asistente de *Agendate*.\n\n' +
        'Para sacar turno, escribí el *código del profesional* (su slug, ej: maria-lopez).\n' +
        'También podés pedir *lista* después de elegir profesional si no hay lugar.'
    );
    return;
  }

  if (['cambiar', 'otro', 'reset', 'salir'].includes(lower)) {
    await resetSession(session);
    await sendText(waId, 'Ok. Escribí el código del profesional para empezar.');
    return;
  }

  if (session.step === 'need_slug') {
    const slug = lower.replace(/^@/, '').replace(/\s+/g, '-');
    const professional = await Professional.findOne({ slug });
    if (!professional) {
      await sendText(
        waId,
        'No encontré ese profesional. Pedile su código (slug) y escribilo acá.'
      );
      return;
    }
    session.professionalId = professional._id;
    const { slots } = await loadSlotsForProfessional(professional);
    session.draft = { ...(session.draft || {}), slots };
    if (!slots.length) {
      session.step = 'waitlist_name';
      await session.save();
      await sendText(
        waId,
        `No hay turnos libres con ${professional.name}.\n` +
          `Te anoto en lista de espera. ¿Cuál es tu *nombre*?`
      );
      return;
    }
    session.step = 'show_slots';
    await session.save();
    await sendText(waId, await showSlotsMessage(professional, slots));
    return;
  }

  const professional = session.professionalId
    ? await Professional.findById(session.professionalId)
    : null;

  if (!professional) {
    session.step = 'need_slug';
    await session.save();
    await sendText(waId, 'Primero escribí el código del profesional.');
    return;
  }

  if (lower === 'lista' || lower === 'espera' || lower === 'lista de espera') {
    session.step = 'waitlist_name';
    session.draft = { ...(session.draft || {}), startsAt: null, endsAt: null };
    await session.save();
    await sendText(waId, 'Perfecto. ¿Cuál es tu *nombre* para la lista de espera?');
    return;
  }

  if (session.step === 'show_slots') {
    const slots = session.draft?.slots || [];
    const n = Number(text);
    if (!Number.isInteger(n) || n < 1 || n > slots.length) {
      await sendText(
        waId,
        `Elegí un número del 1 al ${slots.length}, o *lista* / *cambiar*.`
      );
      return;
    }
    const slot = slots[n - 1];
    session.draft = {
      ...(session.draft || {}),
      startsAt: slot.startsAt,
      endsAt: slot.endsAt || null,
    };
    session.step = 'need_name';
    await session.save();
    await sendText(waId, '¿Cuál es tu *nombre*?');
    return;
  }

  if (session.step === 'need_name') {
    session.draft = { ...(session.draft || {}), name: text };
    session.step = 'need_email';
    await session.save();
    await sendText(waId, '¿Cuál es tu *email*?');
    return;
  }

  if (session.step === 'need_email') {
    const email = text.trim();
    if (!email.includes('@')) {
      await sendText(waId, 'Necesito un email válido (ej: vos@mail.com).');
      return;
    }
    session.draft = { ...(session.draft || {}), email };
    await session.save();

    try {
      const result = await createAppointment({
        professional,
        startsAt: session.draft.startsAt,
        endsAt: session.draft.endsAt || undefined,
        patientData: {
          name: session.draft.name,
          email,
          phone: waId,
        },
        source: 'whatsapp',
      });

      session.step = 'done';
      await session.save();

      const when = new Date(result.appointment.startsAt).toLocaleString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });

      await sendText(
        waId,
        `✅ Turno confirmado con *${professional.name}*\n` +
          `${when}\n\n` +
          `Si necesitás otro turno, escribí *hola*.`
      );
    } catch (err) {
      if (err.status === 409) {
        session.step = 'waitlist_name';
        await session.save();
        await sendText(
          waId,
          'Ese horario se ocupó. ¿Querés lista de espera? Decime tu *nombre*.'
        );
        return;
      }
      await sendText(waId, `No pude agendar: ${err.message}. Probá *cambiar*.`);
    }
    return;
  }

  if (session.step === 'waitlist_name') {
    session.draft = { ...(session.draft || {}), name: text };
    session.step = 'waitlist_email';
    await session.save();
    await sendText(waId, '¿Cuál es tu *email*?');
    return;
  }

  if (session.step === 'waitlist_email') {
    const email = text.trim();
    if (!email.includes('@')) {
      await sendText(waId, 'Necesito un email válido.');
      return;
    }
    try {
      const { position } = await joinWaitlist({
        professionalId: professional._id,
        name: session.draft.name,
        email,
        phone: waId,
        preferredDate: session.draft.preferredDate || null,
      });
      session.step = 'done';
      await session.save();
      await sendText(
        waId,
        `📝 Quedaste en lista de espera (#${position}) con *${professional.name}*.\n` +
          `Si alguien cancela, te avisamos automáticamente en orden de llegada.\n\nEscribí *hola* para otro trámite.`
      );
    } catch (err) {
      await sendText(waId, err.message || 'No pude anotarte. Probá de nuevo.');
    }
    return;
  }

  await sendText(
    waId,
    'Escribí *hola* para empezar, o el código del profesional.'
  );
}

module.exports = {
  handleIncomingText,
  loadSlotsForProfessional,
};
