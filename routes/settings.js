import { Router } from 'express';
import fetch from 'node-fetch';
import {
  getPublicSettings,
  updatePiHoleConnection,
  setDashboardPassword,
  verifyDashboardPassword,
  hasDashboardPassword,
  getPiHoleApiToken
} from '../lib/settings.js';
import { resetPiHoleSession } from './api.js';

export const settingsRouter = Router();

settingsRouter.get('/', (req, res) => {
  res.json(getPublicSettings());
});

// Separate from GET / on purpose: the plaintext token is only ever sent
// when explicitly requested (the "reveal" button), never as part of the
// regular settings payload the UI fetches on every page load.
settingsRouter.get('/reveal-token', (req, res) => {
  res.json({ apiToken: getPiHoleApiToken() || '' });
});

settingsRouter.put('/', async (req, res) => {
  try {
    const { host, port, apiToken, currentPassword, newPassword } = req.body;

    if (newPassword) {
      if (hasDashboardPassword() && !verifyDashboardPassword(currentPassword)) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
      }
      setDashboardPassword(newPassword);
    }

    if (host !== undefined || port !== undefined || apiToken) {
      updatePiHoleConnection({ host, port, apiToken });
      resetPiHoleSession();
    }

    res.json({ success: true, settings: getPublicSettings() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tests connectivity using either the provided (unsaved) values or, if
// omitted, whatever is currently persisted — lets the UI validate before
// committing a change that could lock the dashboard out of Pi-hole.
settingsRouter.post('/test-connection', async (req, res) => {
  try {
    const host = req.body.host || getPublicSettings().piHoleHost;
    const port = req.body.port || getPublicSettings().piHolePort;
    const apiToken = req.body.apiToken || getPiHoleApiToken();

    if (!apiToken) {
      return res.status(400).json({ success: false, error: 'Missing Pi-hole API token' });
    }

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const response = await fetch(`https://${host}:${port}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: apiToken })
    });
    const data = await response.json();

    if (data.session?.sid) {
      return res.json({ success: true });
    }
    return res.status(400).json({ success: false, error: data.error?.message || 'Authentication failed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
