const jwt = require('jsonwebtoken');
const Professional = require('../models/Professional');

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.professionalId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

async function loadProfessional(req, res, next) {
  try {
    const professional = await Professional.findById(req.professionalId);
    if (!professional) {
      return res.status(401).json({ error: 'Profesional no encontrado' });
    }
    req.professional = professional;
    next();
  } catch (err) {
    next(err);
  }
}

function signToken(professional) {
  return jwt.sign(
    { sub: professional._id.toString(), email: professional.email },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '30d' }
  );
}

module.exports = { authRequired, loadProfessional, signToken };
