import { verifyDashboardPassword, hasDashboardPassword } from '../lib/settings.js';

export function authenticateUser(req, res) {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  if (!hasDashboardPassword()) {
    return res.status(400).json({ error: 'No password configured. Set one in Settings first.' });
  }

  if (!verifyDashboardPassword(password)) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  req.session.authenticated = true;
  res.json({ success: true, message: 'Logged in' });
}

export function requireAuth(req, res, next) {
  if (!req.session.authenticated) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
