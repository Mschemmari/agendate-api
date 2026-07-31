const express = require('express');
const { generateSlots, buildGoogleCalendarUrl } = require('@agendate/shared');
const Professional = require('../models/Professional');
const AvailabilityRule = require('../models/AvailabilityRule');
const Service = require('../models/Service');
const Appointment = require('../models/Appointment');
const {
  createAppointment,
  getDefaultDuration,
} = require('../services/appointments');

const router = express.Router();

router.get('/:slug', async (req, res, next) => {
  try {
    const professional = await Professional.findOne({ slug: req.params.slug });
    if (!professional) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }

    const service = await Service.findOne({
      professionalId: professional._id,
    }).sort({ createdAt: 1 });

    const { countWaiting } = require('../services/waitlist');
    const waitingCount = await countWaiting(professional._id);

    res.json({
      name: professional.name,
      slug: professional.slug,
      sessionMode: professional.sessionMode || 'individual',
      waitingCount,
      service: service
        ? {
            id: service._id,
            name: service.name,
            durationMinutes: service.durationMinutes,
            price: service.price ?? 0,
          }
        : { name: 'Consulta', durationMinutes: 45, price: 0 },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:slug/slots', async (req, res, next) => {
  try {
    const professional = await Professional.findOne({ slug: req.params.slug });
    if (!professional) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }

    const from = req.query.from
      ? new Date(req.query.from)
      : new Date();
    const to = req.query.to
      ? new Date(req.query.to)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

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
    });

    res.json({ durationMinutes, sessionMode, slots });
  } catch (err) {
    next(err);
  }
});

router.post('/:slug/book', async (req, res, next) => {
  try {
    const professional = await Professional.findOne({ slug: req.params.slug });
    if (!professional) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }

    const { startsAt, name, email, phone } = req.body;
    if (!startsAt || !name || !email || !phone) {
      return res
        .status(400)
        .json({ error: 'startsAt, name, email y phone son requeridos' });
    }

    const result = await createAppointment({
      professional,
      startsAt,
      patientData: { name, email, phone },
      source: 'link',
    });

    const googleCalendarUrl =
      result.googleCalendarUrl ||
      buildGoogleCalendarUrl({
        title: `Turno con ${professional.name}`,
        startsAt: result.appointment.startsAt,
        endsAt: result.appointment.endsAt,
      });

    res.status(201).json({
      id: result.appointment._id,
      startsAt: result.appointment.startsAt,
      endsAt: result.appointment.endsAt,
      status: result.appointment.status,
      professionalName: professional.name,
      googleCalendarUrl,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:slug/waitlist', async (req, res, next) => {
  try {
    const professional = await Professional.findOne({ slug: req.params.slug });
    if (!professional) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }

    const { name, email, phone, preferredDate } = req.body;
    if (!name || !email || !phone) {
      return res
        .status(400)
        .json({ error: 'name, email y phone son requeridos' });
    }

    const { joinWaitlist } = require('../services/waitlist');
    const { entry, position } = await joinWaitlist({
      professionalId: professional._id,
      name,
      email,
      phone,
      preferredDate: preferredDate || null,
    });

    res.status(201).json({
      id: entry._id,
      position,
      preferredDate: entry.preferredDate,
      professionalName: professional.name,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
