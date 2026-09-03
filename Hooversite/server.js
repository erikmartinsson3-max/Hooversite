const express      = require('express');
const fs           = require('fs');
const path         = require('path');
const cookieParser = require('cookie-parser');

const app  = express();
const PORT = process.env.PORT || 3000;

// Set ADMIN_PASSWORD as an environment variable on Render — never hardcode it
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const MEDIA_PATH     = path.join(__dirname, 'media.json');

app.use(express.json());
app.use(cookieParser());

/* ── AUTH MIDDLEWARE ── */
function requireAuth(req, res, next) {
  if (req.cookies.admin_token === ADMIN_PASSWORD) return next();
  res.status(401).json({ error: 'unauthorized' });
}

/* ── LOGIN ── */
app.post('/api/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    res.cookie('admin_token', ADMIN_PASSWORD, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
      sameSite: 'strict',
    });
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: 'wrong password' });
  }
});

/* ── LOGOUT ── */
app.post('/api/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ ok: true });
});

/* ── GET MEDIA (admin only) ── */
app.get('/api/media', requireAuth, (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(MEDIA_PATH, 'utf8'));
    res.json(data);
  } catch {
    res.json({ items: [] });
  }
});

/* ── SAVE MEDIA (admin only) ── */
app.post('/api/save', requireAuth, (req, res) => {
  try {
    if (!req.body || !Array.isArray(req.body.items)) {
      return res.status(400).json({ error: 'invalid payload' });
    }
    fs.writeFileSync(MEDIA_PATH, JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ error: 'could not write media.json' });
  }
});

/* ── ADMIN PAGE ── */
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

/* ── SERVE STATIC SITE ── */
// This serves index.html, css/, js/, media.json etc. from the project root.
// Put all your existing site files alongside server.js.
app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`Galleri   running on http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
});
