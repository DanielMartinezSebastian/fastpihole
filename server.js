import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { authenticateUser, requireAuth } from './middleware/auth.js';
import { piHoleRouter } from './routes/api.js';
import { settingsRouter } from './routes/settings.js';
import { initSettings, getSessionSecret, getPiHoleHost, getPiHolePort } from './lib/settings.js';

dotenv.config();

// Loads (and, on first run, migrates from .env into) the encrypted SQLite
// settings store before anything else depends on it.
initSettings();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.DASHBOARD_PORT || 20053;

// Middleware
app.use(express.json());

// Serve React app (built with Vite)
const distPath = join(__dirname, 'public', 'dist');
app.use(express.static(distPath));

// `secure` is deliberately NOT tied to NODE_ENV=production: this app is
// served over plain HTTP on the LAN (http://pi.hole:<port>) with no TLS
// setup documented anywhere. A `Secure` cookie gets silently dropped by
// the browser on any non-HTTPS origin other than localhost/127.0.0.1 —
// login would "succeed" but every subsequent request would 401. Only
// enable this if you're actually terminating TLS in front of the app.
app.use(session({
  secret: getSessionSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.COOKIE_SECURE === 'true',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Auth Routes
app.post('/api/auth/login', authenticateUser);

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get('/api/auth/check', (req, res) => {
  res.json({ authenticated: req.session.authenticated || false });
});

// Protected API Routes
app.use('/api/pihole', requireAuth, piHoleRouter);
app.use('/api/settings', requireAuth, settingsRouter);

// Serve React app index.html for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'dist', 'index.html'));
});

import { authenticatePiHole } from './routes/api.js';

app.listen(PORT, () => {
  console.log(`🚀 Pi-hole Dashboard running on http://localhost:${PORT}`);
  console.log(`📡 Connected to Pi-hole: ${getPiHoleHost()}:${getPiHolePort()}`);
  // Authenticate after server starts
  authenticatePiHole();
});
