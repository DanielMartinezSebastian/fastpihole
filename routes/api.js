import { Router } from 'express';
import fetch from 'node-fetch';
import { getClientGroupSnapshot, saveClientGroupSnapshot } from '../lib/db.js';
import { getPiHoleHost, getPiHolePort, getPiHoleApiToken } from '../lib/settings.js';

export const piHoleRouter = Router();

// Persists, per client, the groups it belonged to right before being
// unblocked from the dashboard — so re-enabling blocking later (even
// after a server restart or days later) restores its original group
// (e.g. a custom "Kids" parental-control group) instead of defaulting to Default.
// Backed by lib/db.js (SQLite) as of the settings-panel migration.

function getPiHoleUrl() {
  return `https://${getPiHoleHost()}:${getPiHolePort()}/api`;
}

// Ignore SSL certificate warnings
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Session management
let session = {
  sid: null,
  expiresAt: 0
};

// Call after changing the Pi-hole connection settings so the next API call
// re-authenticates against the (possibly new) host/token instead of reusing
// a session tied to the old configuration.
export function resetPiHoleSession() {
  session.sid = null;
  session.expiresAt = 0;
}

async function authenticate() {
  try {
    const password = getPiHoleApiToken();

    if (!password) {
      throw new Error('PI_HOLE_API_TOKEN not configured');
    }

    const response = await fetch(`${getPiHoleUrl()}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    const data = await response.json();

    if (data.session?.sid) {
      session.sid = data.session.sid;
      session.expiresAt = Date.now() + (data.session.validity * 1000);
      console.log('✓ Authenticated with Pi-hole');
      return true;
    }

    throw new Error(data.error?.message || 'Authentication failed');
  } catch (error) {
    console.error('Authentication error:', error.message);
    return false;
  }
}

async function ensureAuthenticated() {
  if (!session.sid || Date.now() >= session.expiresAt) {
    return await authenticate();
  }
  return true;
}

async function callPiHoleAPI(endpoint, method = 'GET', body = null) {
  try {
    // Ensure we have a valid session
    const authenticated = await ensureAuthenticated();
    if (!authenticated) {
      throw new Error('Failed to authenticate with Pi-hole');
    }

    const url = `${getPiHoleUrl()}${endpoint}?sid=${session.sid}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Pi-hole Dashboard'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || `API Error: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Pi-hole API Error:', error.message);
    throw error;
  }
}

// Export for server startup
export async function authenticatePiHole() {
  await authenticate();
}

// Group used to exclude specific clients from DNS blocking.
// A client moved into this group (and out of Default) has no adlists
// applied to it, so it is effectively unblocked. Resolved lazily and cached.
const UNBLOCKED_GROUP_NAME = 'FILTER DEACTIVATED';
let unblockedGroupId = null;

async function ensureUnblockedGroup() {
  if (unblockedGroupId !== null) {
    return unblockedGroupId;
  }

  const data = await callPiHoleAPI('/groups');
  const existing = data.groups?.find((g) => g.name === UNBLOCKED_GROUP_NAME);

  if (existing) {
    unblockedGroupId = existing.id;
    return unblockedGroupId;
  }

  const created = await callPiHoleAPI('/groups', 'POST', {
    name: UNBLOCKED_GROUP_NAME,
    comment: 'Clients excluded from DNS blocking (managed from the dashboard)',
    enabled: true
  });

  unblockedGroupId = created.groups[0].id;
  return unblockedGroupId;
}

// Get Pi-hole status
piHoleRouter.get('/status', async (req, res) => {
  try {
    const data = await callPiHoleAPI('/dns/blocking');
    res.json({
      status: data.blocking === 'enabled' ? 'enabled' : 'disabled'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enable Pi-hole
piHoleRouter.post('/enable', async (req, res) => {
  try {
    await callPiHoleAPI('/dns/blocking', 'POST', { blocking: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Disable Pi-hole
piHoleRouter.post('/disable', async (req, res) => {
  try {
    await callPiHoleAPI('/dns/blocking', 'POST', { blocking: false });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get clients (annotated with per-client blocking status)
piHoleRouter.get('/clients', async (req, res) => {
  try {
    const groupId = await ensureUnblockedGroup();
    const data = await callPiHoleAPI('/clients');

    data.clients = (data.clients || []).map((client) => ({
      ...client,
      blocked: !(client.groups || []).includes(groupId)
    }));

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle DNS blocking for a single client
piHoleRouter.post('/clients/:client/toggle', async (req, res) => {
  try {
    const { client } = req.params;
    const groupId = await ensureUnblockedGroup();

    const current = await callPiHoleAPI(`/clients/${encodeURIComponent(client)}`);
    const clientData = current.clients?.[0];

    if (!clientData) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const currentGroups = clientData.groups || [0];
    const isCurrentlyUnblocked = currentGroups.includes(groupId);

    let newGroups;
    if (isCurrentlyUnblocked) {
      // Re-enabling blocking: restore whatever groups the client belonged
      // to right before it was unblocked (falls back to Default if we
      // somehow never captured a snapshot for it).
      const snapshot = await getClientGroupSnapshot(client);
      newGroups = snapshot && snapshot.length > 0 ? snapshot : [0];
    } else {
      // About to unblock: remember its current groups first so they can
      // be restored later, then move it into the no-adlist group.
      await saveClientGroupSnapshot(client, currentGroups);
      newGroups = [groupId];
    }

    await callPiHoleAPI(`/clients/${encodeURIComponent(client)}`, 'PUT', {
      comment: clientData.comment,
      groups: newGroups
    });

    res.json({ success: true, blocked: isCurrentlyUnblocked });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get summary stats
piHoleRouter.get('/summary', async (req, res) => {
  try {
    const data = await callPiHoleAPI('/stats/summary');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get host system stats (uptime, CPU, RAM) — trimmed down from Pi-hole's
// /info/system to just what the dashboard's "System" card shows.
piHoleRouter.get('/system-info', async (req, res) => {
  try {
    const data = await callPiHoleAPI('/info/system');
    res.json({
      uptime: data.system?.uptime ?? null,
      cpuPercent: data.system?.cpu?.['%cpu'] ?? null,
      ramPercent: data.system?.memory?.ram?.['%used'] ?? null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
