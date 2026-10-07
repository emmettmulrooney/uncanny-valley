const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const { Pool } = require('pg');

const PORT = process.env.PORT || 3000;
const ADMIN_USER = 'emmett';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const MAX_LENGTH = 1000;

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
if (!ADMIN_PASSWORD) throw new Error('ADMIN_PASSWORD is not set');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function setupDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS suggestions (
      id SERIAL PRIMARY KEY,
      text TEXT NOT NULL,
      approved BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function safeEqual(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function requireAdmin(req, res, next) {
  const [scheme, encoded] = (req.headers.authorization || '').split(' ');
  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString();
    const i = decoded.indexOf(':');
    if (safeEqual(decoded.slice(0, i), ADMIN_USER) && safeEqual(decoded.slice(i + 1), ADMIN_PASSWORD)) {
      return next();
    }
  }
  res.set('WWW-Authenticate', 'Basic realm="Uncanny Valley admin"');
  res.status(401).send('Locked.');
}

// One post per IP every 30 seconds keeps a single person from flooding the box.
const lastPostByIp = new Map();
function rateLimit(req, res, next) {
  const now = Date.now();
  const last = lastPostByIp.get(req.ip) || 0;
  if (now - last < 30_000) {
    return res.status(429).json({ error: 'Slow down. Try again in a few seconds.' });
  }
  lastPostByIp.set(req.ip, now);
  next();
}

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '10kb' }));

app.get('/api/suggestions', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, text, created_at FROM suggestions WHERE approved ORDER BY created_at DESC LIMIT 200'
  );
  res.json(rows);
});

app.post('/api/suggestions', rateLimit, async (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text) return res.status(400).json({ error: 'Type a suggestion first.' });
  if (text.length > MAX_LENGTH) return res.status(400).json({ error: `Keep it under ${MAX_LENGTH} characters.` });
  await pool.query('INSERT INTO suggestions (text) VALUES ($1)', [text]);
  res.status(201).json({ ok: true });
});

app.use(['/admin', '/admin.html', '/api/admin'], requireAdmin);

app.get(['/admin', '/admin.html'], (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.get('/api/admin/suggestions', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, text, approved, created_at FROM suggestions ORDER BY approved, created_at DESC'
  );
  res.json(rows);
});

app.post('/api/admin/suggestions/:id/approve', async (req, res) => {
  await pool.query('UPDATE suggestions SET approved = TRUE WHERE id = $1', [Number(req.params.id)]);
  res.json({ ok: true });
});

app.delete('/api/admin/suggestions/:id', async (req, res) => {
  await pool.query('DELETE FROM suggestions WHERE id = $1', [Number(req.params.id)]);
  res.json({ ok: true });
});

const PUBLIC_FILES = ['index.html', 'entities.html', 'people.html', 'suggest.html', 'style.css'];
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/:file', (req, res, next) => {
  if (!PUBLIC_FILES.includes(req.params.file)) return next();
  res.sendFile(path.join(__dirname, req.params.file));
});

app.use((req, res) => res.status(404).send('Nothing here. Or is there?'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong.' });
});

setupDatabase().then(() => {
  app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
});
