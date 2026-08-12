import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { getRawSetting, setRawSetting } from './db.js';
import { encrypt, decrypt } from './crypto.js';

// Keys whose value is AES-encrypted at rest (recoverable — needed to call the Pi-hole API).
const ENCRYPTED_KEYS = new Set(['piHoleApiToken', 'sessionSecret']);
const BCRYPT_ROUNDS = 12;

// Easy to remember, on-brand — lets a fresh install boot straight to a
// working login instead of a mandatory setup wizard. Printed to the server
// log so whoever installed it can find it without reading the source.
const DEFAULT_DASHBOARD_PASSWORD = 'fastpihole';

function readValue(key) {
  const row = getRawSetting(key);
  if (!row) return undefined;
  return row.encrypted ? decrypt(row.value) : row.value;
}

function writeValue(key, value) {
  setRawSetting(key, ENCRYPTED_KEYS.has(key) ? encrypt(value) : value, ENCRYPTED_KEYS.has(key));
}

// One-time import of the previous .env-based configuration, so upgrading to
// the settings panel doesn't require re-entering everything by hand. Runs
// only while the DB has no Pi-hole host configured yet.
export function initSettings() {
  if (readValue('piHoleHost') === undefined) {
    writeValue('piHoleHost', process.env.PI_HOLE_HOST || 'pi.hole');
    writeValue('piHolePort', String(process.env.PI_HOLE_PORT || 443));

    if (process.env.PI_HOLE_API_TOKEN && process.env.PI_HOLE_API_TOKEN !== 'your-application-password-here') {
      writeValue('piHoleApiToken', process.env.PI_HOLE_API_TOKEN);
      console.log('✓ Migrated PI_HOLE_API_TOKEN from .env into encrypted settings store');
    }

    if (process.env.DASHBOARD_PASSWORD && process.env.DASHBOARD_PASSWORD !== 'your-secure-password-here') {
      setRawSetting('dashboardPasswordHash', bcrypt.hashSync(process.env.DASHBOARD_PASSWORD, BCRYPT_ROUNDS), false);
      console.log('✓ Migrated DASHBOARD_PASSWORD from .env into hashed settings store');
    }
  }

  if (!hasDashboardPassword()) {
    setRawSetting('dashboardPasswordHash', bcrypt.hashSync(DEFAULT_DASHBOARD_PASSWORD, BCRYPT_ROUNDS), false);
    console.log(`⚠ No dashboard password was configured — using the default password "${DEFAULT_DASHBOARD_PASSWORD}". Change it from Ajustes.`);
  }

  if (readValue('sessionSecret') === undefined) {
    writeValue('sessionSecret', process.env.SESSION_SECRET || randomBytes(48).toString('hex'));
  }
}

export function getPiHoleHost() {
  return readValue('piHoleHost') || 'pi.hole';
}

export function getPiHolePort() {
  return readValue('piHolePort') || '443';
}

export function getPiHoleApiToken() {
  return readValue('piHoleApiToken');
}

export function getSessionSecret() {
  return readValue('sessionSecret');
}

export function hasPiHoleApiToken() {
  return Boolean(readValue('piHoleApiToken'));
}

export function hasDashboardPassword() {
  return Boolean(getRawSetting('dashboardPasswordHash'));
}

export function verifyDashboardPassword(password) {
  const row = getRawSetting('dashboardPasswordHash');
  if (!row || !password) return false;
  return bcrypt.compareSync(password, row.value);
}

export function setDashboardPassword(password) {
  setRawSetting('dashboardPasswordHash', bcrypt.hashSync(password, BCRYPT_ROUNDS), false);
}

// Returns the connection settings visible to the dashboard UI. Secrets are
// never sent back in decrypted form — only whether they are set.
export function getPublicSettings() {
  return {
    piHoleHost: getPiHoleHost(),
    piHolePort: getPiHolePort(),
    hasPiHoleApiToken: hasPiHoleApiToken(),
    hasDashboardPassword: hasDashboardPassword()
  };
}

export function updatePiHoleConnection({ host, port, apiToken }) {
  if (host !== undefined && host !== '') writeValue('piHoleHost', host);
  if (port !== undefined && port !== '') writeValue('piHolePort', String(port));
  if (apiToken) writeValue('piHoleApiToken', apiToken);
}
