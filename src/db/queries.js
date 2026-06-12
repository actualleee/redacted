// src/db/queries.js
// All database operations. Import from here, never write raw SQL in components.

import { dbGet, dbAll, dbRun, dbTransaction } from './database';

// Re-export low-level helpers so screens can import from one place
export { dbGet, dbAll, dbRun, dbTransaction } from './database';
import { format, parseISO } from 'date-fns';

const today = () => format(new Date(), 'yyyy-MM-dd');

// ─── Settings ─────────────────────────────────────────────────────────────────

export const Settings = {
  async get() {
    return dbGet('SELECT * FROM app_settings WHERE id = 1');
  },
  async update(fields) {
    const keys = Object.keys(fields);
    const set = keys.map(k => `${k} = ?`).join(', ');
    const vals = Object.values(fields);
    return dbRun(`UPDATE app_settings SET ${set} WHERE id = 1`, vals);
  },
};

// ─── Security ─────────────────────────────────────────────────────────────────

export const Security = {
  async get() {
    return dbGet('SELECT * FROM security_config WHERE id = 1');
  },
  async update(fields) {
    const keys = Object.keys(fields);
    const set = keys.map(k => `${k} = ?`).join(', ');
    const vals = Object.values(fields);
    return dbRun(`UPDATE security_config SET ${set} WHERE id = 1`, vals);
  },
};

// ─── Cycles ───────────────────────────────────────────────────────────────────

export const Cycles = {
  async getAll() {
    return dbAll(
      'SELECT * FROM cycles ORDER BY start_date DESC'
    );
  },

  async getCurrent() {
    return dbGet(
      `SELECT * FROM cycles
       WHERE start_date <= ?
       AND (end_date IS NULL OR end_date >= ?)
       ORDER BY start_date DESC LIMIT 1`,
      [today(), today()]
    );
  },

  async getRecent(limit = 6) {
    return dbAll(
      `SELECT * FROM cycles
       WHERE is_predicted = 0
       ORDER BY start_date DESC LIMIT ?`,
      [limit]
    );
  },

  async startNew(date) {
    // Close current cycle if open
    await dbRun(
      `UPDATE cycles SET end_date = ?, updated_at = datetime('now')
       WHERE end_date IS NULL AND is_predicted = 0`,
      [format(parseISO(date), 'yyyy-MM-dd')]
    );
    return dbRun(
      `INSERT OR IGNORE INTO cycles (start_date) VALUES (?)`,
      [date]
    );
  },

  async end(cycleId, endDate) {
    const start = await dbGet(
      'SELECT start_date FROM cycles WHERE id = ?', [cycleId]
    );
    if (!start) return;
    const diff = Math.round(
      (parseISO(endDate) - parseISO(start.start_date)) / (1000 * 60 * 60 * 24)
    );
    return dbRun(
      `UPDATE cycles
       SET end_date = ?, period_length = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [endDate, diff, cycleId]
    );
  },

  async upsertPredicted(startDate, cycleLength) {
    return dbRun(
      `INSERT OR REPLACE INTO cycles (start_date, cycle_length, is_predicted)
       VALUES (?, ?, 1)`,
      [startDate, cycleLength]
    );
  },
};

// ─── Daily Logs ───────────────────────────────────────────────────────────────

export const DailyLogs = {
  async getOrCreate(date) {
    const existing = await dbGet(
      'SELECT * FROM daily_logs WHERE date = ?', [date]
    );
    if (existing) return existing;
    await dbRun(
      'INSERT OR IGNORE INTO daily_logs (date) VALUES (?)', [date]
    );
    return dbGet('SELECT * FROM daily_logs WHERE date = ?', [date]);
  },

  async getByDate(date) {
    return dbGet('SELECT * FROM daily_logs WHERE date = ?', [date]);
  },

  async getRange(startDate, endDate) {
    return dbAll(
      `SELECT * FROM daily_logs
       WHERE date BETWEEN ? AND ?
       ORDER BY date ASC`,
      [startDate, endDate]
    );
  },

  async update(date, fields) {
    // Ensure row exists
    await this.getOrCreate(date);
    const keys = Object.keys(fields);
    const set = keys.map(k => `${k} = ?`).join(', ');
    const vals = [...Object.values(fields), date];
    return dbRun(
      `UPDATE daily_logs
       SET ${set}, updated_at = datetime('now')
       WHERE date = ?`,
      vals
    );
  },

  async getWithDetails(date) {
    const log = await this.getByDate(date);
    if (!log) return null;
    const symptoms = await Symptoms.getByDate(date);
    const sex = await SexLogs.getByDate(date);
    const meds = await Medications.getByDate(date);
    return { ...log, symptoms, sex, meds };
  },
};

// ─── Symptoms ─────────────────────────────────────────────────────────────────

export const Symptoms = {
  async getByDate(date) {
    return dbAll('SELECT * FROM symptoms WHERE date = ?', [date]);
  },

  async add(date, symptom, severity, location = null) {
    const log = await DailyLogs.getOrCreate(date);
    return dbRun(
      `INSERT INTO symptoms (log_id, date, symptom, severity, location)
       VALUES (?, ?, ?, ?, ?)`,
      [log.id, date, symptom, severity, location]
    );
  },

  async remove(id) {
    return dbRun('DELETE FROM symptoms WHERE id = ?', [id]);
  },

  async getFrequency(limit = 3) {
    // Top symptoms over last 3 months
    const threeMonthsAgo = format(
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'
    );
    return dbAll(
      `SELECT symptom, COUNT(*) as count, AVG(severity) as avg_severity
       FROM symptoms
       WHERE date >= ?
       GROUP BY symptom
       ORDER BY count DESC
       LIMIT 10`,
      [threeMonthsAgo]
    );
  },
};

// ─── Sex Logs ─────────────────────────────────────────────────────────────────

export const SexLogs = {
  async getByDate(date) {
    return dbAll('SELECT * FROM sex_logs WHERE date = ?', [date]);
  },

  async add(date, data) {
    const log = await DailyLogs.getOrCreate(date);
    return dbRun(
      `INSERT INTO sex_logs
        (log_id, date, protected, contraceptive, initiated_by, satisfaction, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        log.id, date,
        data.protected ?? 1,
        data.contraceptive ?? null,
        data.initiated_by ?? null,
        data.satisfaction ?? null,
        data.notes ?? null,
      ]
    );
  },

  async remove(id) {
    return dbRun('DELETE FROM sex_logs WHERE id = ?', [id]);
  },
};

// ─── Medications ──────────────────────────────────────────────────────────────

export const Medications = {
  async getByDate(date) {
    return dbAll('SELECT * FROM medications WHERE date = ?', [date]);
  },

  async add(date, name, dose = null, taken = 1, notes = null) {
    const log = await DailyLogs.getOrCreate(date);
    return dbRun(
      `INSERT INTO medications (log_id, date, name, dose, taken, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [log.id, date, name, dose, taken, notes]
    );
  },

  async toggleTaken(id, taken) {
    return dbRun('UPDATE medications SET taken = ? WHERE id = ?', [taken, id]);
  },

  async remove(id) {
    return dbRun('DELETE FROM medications WHERE id = ?', [id]);
  },
};

// ─── BBT ──────────────────────────────────────────────────────────────────────

export const BBT = {
  async getRange(startDate, endDate) {
    return dbAll(
      `SELECT date, bbt FROM daily_logs
       WHERE date BETWEEN ? AND ? AND bbt IS NOT NULL
       ORDER BY date ASC`,
      [startDate, endDate]
    );
  },

  async set(date, temp) {
    return DailyLogs.update(date, { bbt: temp });
  },
};

// ─── Pregnancy ────────────────────────────────────────────────────────────────

export const Pregnancy = {
  async getByDate(date) {
    return dbGet('SELECT * FROM pregnancy_log WHERE date = ?', [date]);
  },

  async upsert(date, fields) {
    const existing = await this.getByDate(date);
    if (existing) {
      const keys = Object.keys(fields);
      const set = keys.map(k => `${k} = ?`).join(', ');
      return dbRun(
        `UPDATE pregnancy_log SET ${set} WHERE date = ?`,
        [...Object.values(fields), date]
      );
    }
    const keys = ['date', ...Object.keys(fields)];
    const placeholders = keys.map(() => '?').join(', ');
    return dbRun(
      `INSERT INTO pregnancy_log (${keys.join(', ')}) VALUES (${placeholders})`,
      [date, ...Object.values(fields)]
    );
  },

  async getAll() {
    return dbAll('SELECT * FROM pregnancy_log ORDER BY date ASC');
  },

  async getLMP() {
    const result = await dbGet(
      `SELECT lmp_date FROM pregnancy_log
       WHERE lmp_date IS NOT NULL
       ORDER BY date DESC LIMIT 1`
    );
    return result?.lmp_date;
  },
};

// ─── Export Log ───────────────────────────────────────────────────────────────

export const ExportLog = {
  async record(type, encrypted = 1, note = null) {
    return dbRun(
      `INSERT INTO export_log (type, encrypted, note) VALUES (?, ?, ?)`,
      [type, encrypted, note]
    );
  },
  async getLast() {
    return dbGet('SELECT * FROM export_log ORDER BY exported_at DESC LIMIT 1');
  },
};

// ─── Insights Cache ───────────────────────────────────────────────────────────

export const InsightsCache = {
  async get(key) {
    const row = await dbGet(
      'SELECT value FROM insights_cache WHERE key = ?', [key]
    );
    return row ? JSON.parse(row.value) : null;
  },

  async set(key, value) {
    return dbRun(
      `INSERT OR REPLACE INTO insights_cache (key, value, computed_at)
       VALUES (?, ?, datetime('now'))`,
      [key, JSON.stringify(value)]
    );
  },

  async invalidate(key) {
    return dbRun('DELETE FROM insights_cache WHERE key = ?', [key]);
  },

  async invalidateAll() {
    return dbRun('DELETE FROM insights_cache');
  },
};
