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
    sessionMode: p.sessionMode || 'individual',
  });
});

router.get('/booking-link', (req, res) => {
  const webUrl = (
    process.env.WEB_URL || 'https://agendate-api-web.vercel.app'
  ).replace(/\/$/, '');
  const phone = String(process.env.WHATSAPP_PHONE || '').replace(/\D/g, '');
  const whatsappText = `Hola! Quiero sacar un turno con ${req.professional.name}`;
  const whatsappUrl = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(whatsappText)}`
    : null;

  res.json({
    slug: req.professional.slug,
    url: `${webUrl}/u/${req.professional.slug}`,
    whatsappPhone: phone || null,
    whatsappText,
    whatsappUrl,
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
    res.json({
      sessionMode: req.professional.sessionMode || 'individual',
      rules,
    });
  } catch (err) {
    next(err);
  }
});

router.put('/availability', async (req, res, next) => {
  try {
    const { rules, sessionMode } = req.body;
    if (!Array.isArray(rules)) {
      return res.status(400).json({ error: 'rules debe ser un array' });
    }

    const mode = sessionMode === 'group' ? 'group' : 'individual';
    if (req.professional.sessionMode !== mode) {
      req.professional.sessionMode = mode;
      await req.professional.save();
    }

    await AvailabilityRule.deleteMany({ professionalId: req.professional._id });
    const created =
      rules.length === 0
        ? []
        : await AvailabilityRule.insertMany(
            rules.map((r) => {
              const capacity = Number(r.capacity);
              return {
                professionalId: req.professional._id,
                dayOfWeek: r.dayOfWeek,
                startTime: r.startTime,
                endTime: r.endTime,
                capacity:
                  mode === 'group'
                    ? Number.isFinite(capacity) && capacity >= 1
                      ? capacity
                      : 20
                    : 1,
              };
            })
          );

    res.json({
      sessionMode: mode,
      rules: created,
    });
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
    const { name, durationMinutes, price } = req.body;
    if (!name) return res.status(400).json({ error: 'name es requerido' });
    const service = await Service.create({
      professionalId: req.professional._id,
      name,
      durationMinutes: durationMinutes || 45,
      price: price != null ? Number(price) : 0,
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
    const result = await cancelAppointment({
      professional: req.professional,
      appointmentId: req.params.id,
    });
    const appointment = result.appointment || result;
    res.json({
      id: appointment._id,
      status: appointment.status,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      waitlistOffer: result.waitlistOffer
        ? {
            id: result.waitlistOffer._id,
            name: result.waitlistOffer.name,
            phone: result.waitlistOffer.phone,
            email: result.waitlistOffer.email,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/waitlist', async (req, res, next) => {
  try {
    const { listWaitlist } = require('../services/waitlist');
    const entries = await listWaitlist(req.professional._id);
    res.json(entries);
  } catch (err) {
    next(err);
  }
});

router.patch('/waitlist/:id/cancel', async (req, res, next) => {
  try {
    const { cancelWaitlistEntry } = require('../services/waitlist');
    const entry = await cancelWaitlistEntry({
      professionalId: req.professional._id,
      entryId: req.params.id,
    });
    res.json({ id: entry._id, status: entry.status });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
