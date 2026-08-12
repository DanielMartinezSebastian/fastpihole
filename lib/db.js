import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORE_FILE = process.env.APP_DB_FILE || join(__dirname, '..', 'data', 'app.json');

// Plain JSON on disk instead of a real database: the data here is a
// handful of settings key/values plus a small map of client group
// snapshots — nowhere near enough to need SQL, and this avoids a native
// addon (better-sqlite3) that's slow or outright painful to compile on
// weak ARM boards like a Raspberry Pi.
let store = null;

function loadStore() {
  if (store) return store;

  if (existsSync(STORE_FILE)) {
    try {
      store = JSON.parse(readFileSync(STORE_FILE, 'utf-8'));
    } catch {
      store = {};
    }
  } else {
    store = {};
  }

  store.settings ??= {};
  store.clientGroupSnapshots ??= {};
  return store;
}

// Temp-file-then-rename so a crash mid-write can't leave a corrupt store.
function persist() {
  mkdirSync(dirname(STORE_FILE), { recursive: true });
  const tmpFile = `${STORE_FILE}.tmp`;
  writeFileSync(tmpFile, JSON.stringify(store, null, 2));
  renameSync(tmpFile, STORE_FILE);
}

export function getRawSetting(key) {
  return loadStore().settings[key];
}

export function setRawSetting(key, value, encrypted = false) {
  loadStore().settings[key] = { value, encrypted };
  persist();
}

export function deleteRawSetting(key) {
  delete loadStore().settings[key];
  persist();
}

export function getClientGroupSnapshot(client) {
  const entry = loadStore().clientGroupSnapshots[client];
  return entry ? entry.groups : undefined;
}

export function saveClientGroupSnapshot(client, groups) {
  loadStore().clientGroupSnapshots[client] = { groups, updatedAt: new Date().toISOString() };
  persist();
}
