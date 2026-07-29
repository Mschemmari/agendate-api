const { overlaps, parseTimeToMinutes } = require('@agendate/shared');
const Appointment = require('../models/Appointment');
const AvailabilityRule = require('../models/AvailabilityRule');
const Patient = require('../models/Patient');
const Service = require('../models/Service');
const {
  sendAppointmentConfirmation,
  sendAppointmentCancellation,
} = require('./email');
const { notifyNewAppointment } = require('./push');

function minutesOnDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

async function assertSlotAvailable(professionalId, startsAt, endsAt) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  if (!(start < end)) {
    const err = new Error('Horario inválido');
    err.status = 400;
    throw err;
  }

  const rules = await AvailabilityRule.find({ professionalId });
  const dow = start.getDay();
  const dayRules = rules.filter((r) => r.dayOfWeek === dow);

  if (dayRules.length === 0) {
    const err = new Error('El profesional no atiende ese día');
    err.status = 400;
    throw err;
  }

  const startMin = minutesOnDay(start);
  const endMin = minutesOnDay(end);
  const fits = dayRules.some((r) => {
    const from = parseTimeToMinutes(r.startTime);
    const to = parseTimeToMinutes(r.endTime);
    return startMin >= from && endMin <= to;
  });

  if (!fits) {
    const err = new Error('Fuera del horario de atención');
    err.status = 400;
    throw err;
  }

  const existing = await Appointment.find({
    professionalId,
    status: 'confirmed',
  });

  const conflict = existing.some((a) =>
    overlaps(start, end, new Date(a.startsAt), new Date(a.endsAt))
  );

  if (conflict) {
    const err = new Error('Ese horario ya está ocupado');
    err.status = 409;
    throw err;
  }
}

async function findOrCreatePatient(professionalId, { name, email, phone }) {
  let patient = await Patient.findOne({
    professionalId,
    email: email.toLowerCase().trim(),
  });

  if (patient) {
    patient.name = name || patient.name;
    if (phone) patient.phone = phone;
    await patient.save();
    return patient;
  }

  return Patient.create({
    professionalId,
    name,
    email,
    phone: phone || '',
  });
}

async function getDefaultDuration(professionalId) {
  const service = await Service.findOne({ professionalId }).sort({ createdAt: 1 });
  return service ? service.durationMinutes : 45;
}

async function createAppointment({
  professional,
  startsAt,
  endsAt,
  patientData,
  patientId,
  source,
}) {
  let end = endsAt ? new Date(endsAt) : null;
  if (!end) {
    const duration = await getDefaultDuration(professional._id);
    end = new Date(new Date(startsAt).getTime() + duration * 60 * 1000);
  }

  await assertSlotAvailable(professional._id, startsAt, end);

  let patient;
  if (patientId) {
    patient = await Patient.findOne({
      _id: patientId,
      professionalId: professional._id,
    });
    if (!patient) {
      const err = new Error('Paciente no encontrado');
      err.status = 404;
      throw err;
    }
  } else {
    patient = await findOrCreatePatient(professional._id, patientData);
  }

  const appointment = await Appointment.create({
    professionalId: professional._id,
    patientId: patient._id,
    startsAt: new Date(startsAt),
    endsAt: end,
    status: 'confirmed',
    source,
  });

  const emailResult = await sendAppointmentConfirmation({
    patient,
    professional,
    appointment,
  });

  // Push to professional when patient books via public link (works in background).
  if (source === 'link') {
    const Professional = require('../models/Professional');
    Professional.findById(professional._id)
      .then((fresh) =>
        notifyNewAppointment({
          professional: fresh || professional,
          patient,
          appointment,
        })
      )
      .catch(() => {});
  }

  return {
    appointment,
    patient,
    googleCalendarUrl: emailResult.googleUrl,
  };
}

async function cancelAppointment({ professional, appointmentId }) {
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    professionalId: professional._id,
  });

  if (!appointment) {
    const err = new Error('Turno no encontrado');
    err.status = 404;
    throw err;
  }

  if (appointment.status === 'cancelled') {
    return appointment;
  }

  appointment.status = 'cancelled';
  await appointment.save();

  const patient = await Patient.findById(appointment.patientId);
  if (patient) {
    await sendAppointmentCancellation({ patient, professional, appointment });
  }

  return appointment;
}

module.exports = {
  createAppointment,
  cancelAppointment,
  assertSlotAvailable,
  getDefaultDuration,
  findOrCreatePatient,
};
