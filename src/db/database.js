import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES, SEED_DEFAULTS, INDEXES } from './schema';

export const SCHEMA_VERSION = 3;

let _db = null;

export async function getDB() {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('redacted.db');
  await _db.execAsync('PRAGMA journal_mode = WAL;');
  await _db.execAsync('PRAGMA foreign_keys = ON;');
  return _db;
}

export async function initDatabase() {
  const db = await getDB();
  try {
    for (const statement of CREATE_TABLES) { await db.execAsync(statement); }
    for (const idx of INDEXES) { await db.execAsync(idx); }
    await db.execAsync(SEED_DEFAULTS);
    await runMigrations(db);
    console.log('[Redacted DB] Initialized successfully');
    return true;
  } catch (err) {
    console.error('[Redacted DB] Init failed:', err);
    throw err;
  }
}

async function runMigrations(db) {
  const result = await db.getFirstAsync(`SELECT value FROM schema_meta WHERE key = 'version'`);
  const currentVersion = result ? parseInt(result.value) : 0;
  if (currentVersion >= SCHEMA_VERSION) return;

  console.log(`[Redacted DB] Migrating from v${currentVersion} to v${SCHEMA_VERSION}`);

  if (currentVersion < 2) {
    try { await db.execAsync(`ALTER TABLE daily_logs ADD COLUMN mood_tags TEXT DEFAULT NULL;`); } catch (e) {}
  }
  if (currentVersion < 3) {
    try { await db.execAsync(`ALTER TABLE daily_logs ADD COLUMN discharge TEXT DEFAULT NULL;`); } catch (e) {}
    try { await db.execAsync(`ALTER TABLE daily_logs ADD COLUMN odor TEXT DEFAULT NULL;`); } catch (e) {}
  }

  await db.runAsync(
    `INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', ?)`,
    [SCHEMA_VERSION.toString()]
  );
}

export async function dbGet(query, params = []) { const db = await getDB(); return db.getFirstAsync(query, params); }
export async function dbAll(query, params = []) { const db = await getDB(); return db.getAllAsync(query, params); }
export async function dbRun(query, params = []) { const db = await getDB(); return db.runAsync(query, params); }
export async function dbTransaction(fn) { const db = await getDB(); return db.withTransactionAsync(fn); }
