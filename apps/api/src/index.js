const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectDb } = require('./db');
const authRoutes = require('./routes/auth');
const meRoutes = require('./routes/me');
const publicRoutes = require('./routes/public');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'agendate-api' });
});

app.use('/auth', authRoutes);
app.use('/me', meRoutes);
app.use('/public', publicRoutes);

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || 'Error interno' });
});

async function start() {
  await connectDb();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[api] Listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start API', err);
  process.exit(1);
});
