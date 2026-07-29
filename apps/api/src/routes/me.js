const express = require('express');
const AvailabilityRule = require('../models/AvailabilityRule');
const Service = require('../models/Service');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const { authRequired, loadProfessional } = require('../middleware/auth');
const {
  createAppointment,
  cancelAppointment,
} = require('../services/appointments');

const router = express.Router();
router.use(authRequired, loadProfessional);

router.get('/', (req, res) => {
  const p = req.professional;
  res.json({
    id: p._id,
    email: p.email,
    name: p.name,
    slug: p.slug,
  });
});

router.get('/booking-link', (req, res) => {
  const webUrl = (process.env.WEB_URL || 'http://localhost:5173').replace(/\/$/, '');
  res.json({
    slug: req.professional.slug,
    url: `${webUrl}/u/${req.professional.slug}`,
  });
});

router.post('/push-token', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'token es requerido' });
    }
    await req.professional.updateOne({
      $addToSet: { expoPushTokens: token.trim() },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/push-token', async (req, res, next) => {
  try {
    const { token } = req.body || {};
    if (token) {
      await req.professional.updateOne({
        $pull: { expoPushTokens: token },
      });
    } else {
      await req.professional.updateOne({ $set: { expoPushTokens: [] } });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/availability', async (req, res, next) => {
  try {
    const rules = await AvailabilityRule.find({
      professionalId: req.professional._id,
    }).sort({ dayOfWeek: 1, startTime: 1 });
    res.json(rules);
  } catch (err) {
    next(err);
  }
});

router.put('/availability', async (req, res, next) => {
  try {
    const { rules } = req.body;
    if (!Array.isArray(rules)) {
      return res.status(400).json({ error: 'rules debe ser un array' });
    }

    await AvailabilityRule.deleteMany({ professionalId: req.professional._id });
    const created = await AvailabilityRule.insertMany(
      rules.map((r) => ({
        professionalId: req.professional._id,
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
      }))
    );
    res.json(created);
  } catch (err) {
    next(err);
  }
});

router.get('/services', async (req, res, next) => {
  try {
    const services = await Service.find({ professionalId: req.professional._id });
    res.json(services);
  } catch (err) {
    next(err);
  }
});

router.post('/services', async (req, res, next) => {
  try {
    const { name, durationMinutes } = req.body;
    if (!name) return res.status(400).json({ error: 'name es requerido' });
    const service = await Service.create({
      professionalId: req.professional._id,
      name,
      durationMinutes: durationMinutes || 45,
    });
    res.status(201).json(service);
  } catch (err) {
    next(err);
  }
});

router.get('/patients', async (req, res, next) => {
  try {
    const patients = await Patient.find({
      professionalId: req.professional._id,
    }).sort({ name: 1 });
    res.json(patients);
  } catch (err) {
    next(err);
  }
});

router.post('/patients', async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'name y email son requeridos' });
    }
    const patient = await Patient.create({
      professionalId: req.professional._id,
      name,
      email,
      phone: phone || '',
    });
    res.status(201).json(patient);
  } catch (err) {
    next(err);
  }
});

router.get('/appointments', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const filter = { professionalId: req.professional._id };
    if (from || to) {
      filter.startsAt = {};
      if (from) filter.startsAt.$gte = new Date(from);
      if (to) filter.startsAt.$lte = new Date(to);
    }

    const appointments = await Appointment.find(filter)
      .populate('patientId')
      .sort({ startsAt: 1 });

    res.json(
      appointments.map((a) => ({
        id: a._id,
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        status: a.status,
        source: a.source,
        patient: a.patientId
          ? {
              id: a.patientId._id,
              name: a.patientId.name,
              email: a.patientId.email,
              phone: a.patientId.phone,
            }
          : null,
      }))
    );
  } catch (err) {
    next(err);
  }
});

router.post('/appointments', async (req, res, next) => {
  try {
    const { startsAt, endsAt, patientId, name, email, phone } = req.body;
    if (!startsAt) {
      return res.status(400).json({ error: 'startsAt es requerido' });
    }
    if (!patientId && (!name || !email)) {
      return res
        .status(400)
        .json({ error: 'patientId o (name + email) son requeridos' });
    }

    const result = await createAppointment({
      professional: req.professional,
      startsAt,
      endsAt,
      patientId,
      patientData: { name, email, phone },
      source: 'pro',
    });

    res.status(201).json({
      id: result.appointment._id,
      startsAt: result.appointment.startsAt,
      endsAt: result.appointment.endsAt,
      status: result.appointment.status,
      source: result.appointment.source,
      patient: {
        id: result.patient._id,
        name: result.patient.name,
        email: result.patient.email,
        phone: result.patient.phone,
      },
      googleCalendarUrl: result.googleCalendarUrl,
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/appointments/:id/cancel', async (req, res, next) => {
  try {
    const appointment = await cancelAppointment({
      professional: req.professional,
      appointmentId: req.params.id,
    });
    res.json({
      id: appointment._id,
      status: appointment.status,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
