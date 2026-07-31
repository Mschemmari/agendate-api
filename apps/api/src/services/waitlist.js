const WaitlistEntry = require('../models/WaitlistEntry');
const { notifyWaitlistOffer } = require('./push');

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

async function joinWaitlist({
  professionalId,
  name,
  email,
  phone,
  preferredDate,
}) {
  const existing = await WaitlistEntry.findOne({
    professionalId,
    email: email.toLowerCase().trim(),
    status: 'waiting',
  });
  if (existing) {
    const err = new Error('Ya estás en la lista de espera');
    err.status = 409;
    throw err;
  }

  const entry = await WaitlistEntry.create({
    professionalId,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: phone.trim(),
    preferredDate: preferredDate ? startOfDay(preferredDate) : null,
    status: 'waiting',
  });

  const ahead = await WaitlistEntry.countDocuments({
    professionalId,
    status: 'waiting',
    createdAt: { $lt: entry.createdAt },
  });

  return { entry, position: ahead + 1 };
}

async function listWaitlist(professionalId) {
  const entries = await WaitlistEntry.find({
    professionalId,
    status: { $in: ['waiting', 'offered'] },
  }).sort({ createdAt: 1 });

  return entries.map((e, index) => ({
    id: e._id,
    name: e.name,
    email: e.email,
    phone: e.phone,
    preferredDate: e.preferredDate,
    status: e.status,
    position: index + 1,
    createdAt: e.createdAt,
  }));
}

async function countWaiting(professionalId) {
  return WaitlistEntry.countDocuments({
    professionalId,
    status: 'waiting',
  });
}

async function cancelWaitlistEntry({ professionalId, entryId }) {
  const entry = await WaitlistEntry.findOne({
    _id: entryId,
    professionalId,
  });
  if (!entry) {
    const err = new Error('Entrada no encontrada');
    err.status = 404;
    throw err;
  }
  entry.status = 'cancelled';
  await entry.save();
  return entry;
}

/**
 * Cuando se libera un turno, ofrece el lugar al primero de la lista (FIFO).
 * Prefiere quien pidió ese día; si no hay, el más antiguo en general.
 */
async function offerNextOnSlotFreed({ professional, freedStartsAt }) {
  const dayStart = startOfDay(freedStartsAt);
  const dayEnd = endOfDay(freedStartsAt);

  let entry = await WaitlistEntry.findOne({
    professionalId: professional._id,
    status: 'waiting',
    preferredDate: { $gte: dayStart, $lte: dayEnd },
  }).sort({ createdAt: 1 });

  if (!entry) {
    entry = await WaitlistEntry.findOne({
      professionalId: professional._id,
      status: 'waiting',
    }).sort({ createdAt: 1 });
  }

  if (!entry) return null;

  entry.status = 'offered';
  await entry.save();

  const Professional = require('../models/Professional');
  Professional.findById(professional._id)
    .then((fresh) =>
      notifyWaitlistOffer({
        professional: fresh || professional,
        entry,
        freedStartsAt,
      })
    )
    .catch(() => {});

  // Aviso automático al cliente por WhatsApp (si el teléfono es waId / E.164).
  const { sendText, isConfigured } = require('./whatsappClient');
  if (isConfigured() && entry.phone) {
    const when = new Date(freedStartsAt).toLocaleString('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    sendText(
      entry.phone,
      `Hola ${entry.name}! Se liberó un lugar (${when}) con ${professional.name}.\n` +
        `Estás primero en la lista de espera. Escribí el código *${professional.slug}* para agendar ahora.`
    ).catch(() => {});
  }

  return entry;
}

module.exports = {
  joinWaitlist,
  listWaitlist,
  cancelWaitlistEntry,
  offerNextOnSlotFreed,
  countWaiting,
};
