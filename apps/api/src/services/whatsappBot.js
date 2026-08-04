const { generateSlots } = require('@agendate/shared');
const Professional = require('../models/Professional');
const AvailabilityRule = require('../models/AvailabilityRule');
const Appointment = require('../models/Appointment');
const WhatsAppSession = require('../models/WhatsAppSession');
const { createAppointment, getDefaultDuration } = require('./appointments');
const { joinWaitlist } = require('./waitlist');
const { sendText } = require('./whatsappClient');

const IDLE_STEPS = new Set(['need_professional', 'need_slug', 'done']);

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

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extrae el nombre del profesional si el mensaje lo trae
 * (ej. "Hola! Quiero sacar un turno con Mariano").
 * Devuelve null si solo es un saludo / intención de turno.
 */
function extractProfessionalQuery(text) {
  const t = String(text || '').trim();
  if (!t) return null;

  const withName = [
    /(?:sacar\s+)?(?:un\s+)?(?:turno|cita|hora)\s+(?:con|para|de)\s+(.+)/i,
    /(?:agendar|reservar)\s+(?:turno\s+)?(?:con\s+)?(.+)/i,
    /\bcon\s+([A-Za-zÁÉÍÓÚáéíóúÑñüÜ][\wÁÉÍÓÚáéíóúÑñüÜ.'.\s-]{0,40})$/i,
  ];

  for (const p of withName) {
    const m = t.match(p);
    if (m?.[1]) {
      const cleaned = m[1].replace(/[?.!,]+$/g, '').trim();
      if (cleaned.length >= 2) return cleaned;
    }
  }

  // Solo un nombre corto, sin frases de saludo/turno
  if (
    t.length <= 40 &&
    !/\b(hola|hi|hey|buenas|buen|turno|cita|quiero|necesito|agendar|reservar|lista|cambiar|menu|inicio)\b/i.test(
      t
    )
  ) {
    return t;
  }

  return null;
}

async function findProfessionalsByQuery(query) {
  const q = String(query || '').trim();
  if (!q) return [];

  const slug = q.toLowerCase().replace(/^@/, '').replace(/\s+/g, '-');
  const bySlug = await Professional.findOne({ slug });
  if (bySlug) return [bySlug];

  const escaped = escapeRegex(q);
  return Professional.find({
    name: { $regex: escaped, $options: 'i' },
  })
    .limit(5)
    .exec();
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
      step: 'need_professional',
      draft: {},
    });
  }
  if (session.step === 'need_slug') {
    session.step = 'need_professional';
  }
  return session;
}

async function resetSession(session) {
  session.professionalId = null;
  session.step = 'need_professional';
  session.draft = {};
  await session.save();
}

function slotsBody(professional, slots) {
  if (!slots.length) {
    return (
      `No hay turnos libres con ${professional.name} en los próximos días.\n\n` +
      `Respondé *lista* para anotarte en lista de espera, o *cambiar* para empezar de nuevo.`
    );
  }
  const lines = slots.map((s, i) => formatSlotLine(s, i));
  return (
    `Turnos disponibles:\n\n${lines.join('\n')}\n\n` +
    `Respondé el *número* del horario.\n` +
    `Si no te sirve ninguno: *lista* (espera) o *cambiar*.`
  );
}

async function startWithProfessional(session, waId, professional, { greet = false } = {}) {
  session.professionalId = professional._id;
  const { slots } = await loadSlotsForProfessional(professional);
  session.draft = { ...(session.draft || {}), slots, candidates: undefined };

  if (!slots.length) {
    session.step = 'waitlist_name';
    await session.save();
    const intro = greet
      ? `¡Hola! Soy el asistente de *Agendate* para *${professional.name}*.\n\n`
      : '';
    await sendText(
      waId,
      intro +
        `No hay turnos libres por ahora.\n` +
        `Te anoto en lista de espera. ¿Cuál es tu *nombre*?`
    );
    return;
  }

  session.step = 'show_slots';
  await session.save();
  const intro = greet
    ? `¡Hola! Soy el asistente de *Agendate*.\n` +
      `Acá podés sacar turno con *${professional.name}*.\n\n`
    : '';
  await sendText(waId, intro + slotsBody(professional, slots));
}

/** Primer mensaje (o sesión idle): bienvenida + horarios si ya viene el profesional. */
async function beginConversation(session, waId, text) {
  await resetSession(session);

  const query = extractProfessionalQuery(text);
  if (query) {
    const matches = await findProfessionalsByQuery(query);

    if (matches.length === 1) {
      await startWithProfessional(session, waId, matches[0], { greet: true });
      return;
    }

    if (matches.length > 1) {
      session.step = 'pick_professional';
      session.draft = {
        candidates: matches.map((p) => ({
          id: String(p._id),
          name: p.name,
        })),
      };
      await session.save();
      const lines = matches.map((p, i) => `${i + 1}) ${p.name}`);
      await sendText(
        waId,
        `¡Hola! Soy el asistente de *Agendate*.\n\n` +
          `Encontré varios:\n\n${lines.join('\n')}\n\nRespondé el *número*.`
      );
      return;
    }
  }

  session.step = 'need_professional';
  await session.save();
  await sendText(
    waId,
    '¡Hola! Soy el asistente de *Agendate*.\n\n' +
      '¿Con quién querés sacar turno? Decime el nombre del profesional.'
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

  if (['cambiar', 'otro', 'reset', 'salir', 'menu', 'inicio'].includes(lower)) {
    await resetSession(session);
    await sendText(
      waId,
      'Dale, empecemos de nuevo.\n¿Con quién querés sacar turno?'
    );
    return;
  }

  // Oferta de lista de espera: ya sabemos el profesional
  if (session.step === 'offered') {
    const affirm = ['si', 'sí', 'dale', 'ok', 'okay', 'bueno', 'quiero', 'ya'];
    if (
      affirm.includes(lower) ||
      lower.startsWith('si ') ||
      lower.startsWith('sí ')
    ) {
      const professional = await Professional.findById(session.professionalId);
      if (!professional) {
        await beginConversation(session, waId, text);
        return;
      }
      await startWithProfessional(session, waId, professional, { greet: true });
      return;
    }
  }

  if (session.step === 'pick_professional') {
    const candidates = session.draft?.candidates || [];
    const n = Number(text);
    if (!Number.isInteger(n) || n < 1 || n > candidates.length) {
      await sendText(waId, `Elegí un número del 1 al ${candidates.length}.`);
      return;
    }
    const professional = await Professional.findById(candidates[n - 1].id);
    if (!professional) {
      await beginConversation(session, waId, '');
      return;
    }
    await startWithProfessional(session, waId, professional);
    return;
  }

  // Cualquier mensaje con sesión idle → bienvenida (+ horarios si trae el nombre)
  if (IDLE_STEPS.has(session.step)) {
    await beginConversation(session, waId, text);
    return;
  }

  const professional = session.professionalId
    ? await Professional.findById(session.professionalId)
    : null;

  if (!professional) {
    await beginConversation(session, waId, text);
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
          `Si necesitás otro turno, escribí de nuevo.`
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
          `Si alguien cancela, te avisamos automáticamente.\n\nEscribí de nuevo si querés otro trámite.`
      );
    } catch (err) {
      await sendText(waId, err.message || 'No pude anotarte. Probá de nuevo.');
    }
    return;
  }

  await beginConversation(session, waId, text);
}

module.exports = {
  handleIncomingText,
  loadSlotsForProfessional,
};
