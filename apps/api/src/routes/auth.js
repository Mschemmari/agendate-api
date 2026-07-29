const express = require('express');
const bcrypt = require('bcryptjs');
const Professional = require('../models/Professional');
const Service = require('../models/Service');
const AvailabilityRule = require('../models/AvailabilityRule');
const { slugify } = require('@agendate/shared');
const { signToken } = require('../middleware/auth');

const router = express.Router();

async function uniqueSlug(base) {
  let slug = slugify(base) || 'profesional';
  let n = 0;
  while (await Professional.findOne({ slug: n ? `${slug}-${n}` : slug })) {
    n += 1;
  }
  return n ? `${slug}-${n}` : slug;
}

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'email, password y name son requeridos' });
    }

    const exists = await Professional.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return res.status(409).json({ error: 'Ese email ya está registrado' });
    }

    const slug = await uniqueSlug(name);
    const passwordHash = await bcrypt.hash(password, 10);
    const professional = await Professional.create({
      email,
      passwordHash,
      name,
      slug,
    });

    await Service.create({
      professionalId: professional._id,
      name: 'Consulta',
      durationMinutes: 45,
    });

    const defaultHours = [
      { dayOfWeek: 1, startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 2, startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 3, startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 4, startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 5, startTime: '09:00', endTime: '18:00' },
    ];
    await AvailabilityRule.insertMany(
      defaultHours.map((r) => ({ ...r, professionalId: professional._id }))
    );

    const token = signToken(professional);
    res.status(201).json({
      token,
      professional: {
        id: professional._id,
        email: professional.email,
        name: professional.name,
        slug: professional.slug,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email y password son requeridos' });
    }

    const professional = await Professional.findOne({
      email: email.toLowerCase().trim(),
    });
    if (!professional) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const ok = await bcrypt.compare(password, professional.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = signToken(professional);
    res.json({
      token,
      professional: {
        id: professional._id,
        email: professional.email,
        name: professional.name,
        slug: professional.slug,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
