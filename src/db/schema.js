// src/db/schema.js
// Full database schema for Redacted
// All data stays local. Always.

export const SCHEMA_VERSION = 1;

export const CREATE_TABLES = [
  // ─── Meta ─────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS schema_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,

  // ─── Security ─────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS security_config (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    pin_hash        TEXT,
    decoy_pin_hash  TEXT,
    backup_q1       TEXT,
    backup_a1_hash  TEXT,
    backup_q2       TEXT,
    backup_a2_hash  TEXT,
    backup_q3       TEXT,
    backup_a3_hash  TEXT,
    biometric_on    INTEGER DEFAULT 0,
    auto_lock_mins  INTEGER DEFAULT 5,
    screenshot_block INTEGER DEFAULT 1
  )`,

  // ─── App Settings ──────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS app_settings (
    id                  INTEGER PRIMARY KEY CHECK (id = 1),
    theme               TEXT DEFAULT 'dark',
    condition_endo      INTEGER DEFAULT 0,
    condition_pcos      INTEGER DEFAULT 0,
    condition_ttc       INTEGER DEFAULT 0,
    pregnancy_mode      INTEGER DEFAULT 0,
    avg_cycle_length    INTEGER DEFAULT 28,
    avg_period_length   INTEGER DEFAULT 5,
    notifications_on    INTEGER DEFAULT 1,
    onboarding_done     INTEGER DEFAULT 0,
    created_at          TEXT DEFAULT (datetime('now'))
  )`,

  // ─── Cycles ────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS cycles (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    start_date      TEXT NOT NULL UNIQUE,
    end_date        TEXT,
    cycle_length    INTEGER,
    period_length   INTEGER,
    notes           TEXT,
    is_predicted    INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
  )`,

  // ─── Daily Logs ────────────────────────────────────────────────────────────
  // One row per day. Everything about that day lives here or joins here.
  `CREATE TABLE IF NOT EXISTS daily_logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    date            TEXT NOT NULL UNIQUE,
    cycle_id        INTEGER REFERENCES cycles(id),
    flow            INTEGER CHECK (flow BETWEEN 0 AND 5),
    -- 0=none, 1=spotting, 2=light, 3=medium, 4=heavy, 5=very heavy
    mood            INTEGER CHECK (mood BETWEEN 1 AND 10),
    energy          INTEGER CHECK (energy BETWEEN 1 AND 10),
    pain_level      INTEGER CHECK (pain_level BETWEEN 0 AND 10),
    bbt             REAL,
    -- basal body temp in celsius
    cervical_mucus  TEXT CHECK (cervical_mucus IN (
                      NULL,'dry','sticky','creamy','watery','egg_white','atypical'
                    )),
    notes           TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
  )`,

  // ─── Symptoms ──────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS symptoms (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    log_id      INTEGER NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
    date        TEXT NOT NULL,
    symptom     TEXT NOT NULL,
    -- cramps, bloating, headache, fatigue, nausea, acne, breast_tenderness,
    -- back_pain, mood_swings, insomnia, hot_flashes, spotting, diarrhea,
    -- constipation, dizziness, cravings, anxiety, brain_fog, joint_pain
    severity    INTEGER CHECK (severity BETWEEN 1 AND 5),
    location    TEXT
    -- for pain: lower_left, lower_right, lower_center, upper, back_left, back_right
  )`,

  // ─── Sex Log ───────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS sex_logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    log_id          INTEGER NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
    date            TEXT NOT NULL,
    protected       INTEGER DEFAULT 1,
    -- 1=protected, 0=unprotected
    contraceptive   TEXT,
    -- condom, pill, iud, implant, patch, ring, none, other
    initiated_by    TEXT,
    -- self, partner, mutual
    satisfaction    INTEGER CHECK (satisfaction BETWEEN 1 AND 5),
    notes           TEXT
  )`,

  // ─── Medications / Supplements ─────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS medications (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    log_id      INTEGER NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
    date        TEXT NOT NULL,
    name        TEXT NOT NULL,
    dose        TEXT,
    taken       INTEGER DEFAULT 1,
    notes       TEXT
  )`,

  // ─── Condition-Specific Logs ───────────────────────────────────────────────
  // Catches endo/PCOS-specific tracking needs
  `CREATE TABLE IF NOT EXISTS condition_logs (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    log_id              INTEGER NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
    date                TEXT NOT NULL,
    -- PCOS specific
    pcos_hirsutism      INTEGER CHECK (pcos_hirsutism BETWEEN 0 AND 5),
    pcos_hair_loss      INTEGER DEFAULT 0,
    pcos_weight_change  REAL,
    -- Endo specific
    endo_pain_bowel     INTEGER DEFAULT 0,
    endo_pain_bladder   INTEGER DEFAULT 0,
    endo_pain_sex       INTEGER DEFAULT 0,
    endo_pain_during    INTEGER DEFAULT 0,
    -- shared
    inflammation        INTEGER CHECK (inflammation BETWEEN 0 AND 5),
    notes               TEXT
  )`,

  // ─── Pregnancy Mode ────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS pregnancy_log (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    date                    TEXT NOT NULL UNIQUE,
    lmp_date                TEXT,
    -- last menstrual period (used for EDD)
    edd                     TEXT,
    -- estimated due date
    gestational_week        INTEGER,
    gestational_day         INTEGER,
    weight_kg               REAL,
    belly_cm                REAL,
    -- fundal height
    kicks_today             INTEGER,
    nausea                  INTEGER CHECK (nausea BETWEEN 0 AND 5),
    fatigue                 INTEGER CHECK (fatigue BETWEEN 0 AND 5),
    heartburn               INTEGER DEFAULT 0,
    swelling                INTEGER DEFAULT 0,
    spotting                INTEGER DEFAULT 0,
    mood                    INTEGER CHECK (mood BETWEEN 1 AND 10),
    notes                   TEXT,
    appointment_date        TEXT,
    appointment_notes       TEXT,
    created_at              TEXT DEFAULT (datetime('now'))
  )`,

  // ─── Conception Tracking ───────────────────────────────────────────────────
  // Links sex logs to potential conception windows
  `CREATE TABLE IF NOT EXISTS conception_tracking (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    sex_log_id          INTEGER REFERENCES sex_logs(id),
    date                TEXT NOT NULL,
    in_fertile_window   INTEGER DEFAULT 0,
    ovulation_day       TEXT,
    -- estimated ovulation date at time of log
    conception_likely   INTEGER DEFAULT 0,
    notes               TEXT
  )`,

  // ─── Insights Cache ────────────────────────────────────────────────────────
  // Pre-computed patterns so insights screen is fast
  `CREATE TABLE IF NOT EXISTS insights_cache (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    key           TEXT NOT NULL UNIQUE,
    -- avg_cycle_length, avg_luteal_length, common_symptoms, etc.
    value         TEXT NOT NULL,
    -- JSON string
    computed_at   TEXT DEFAULT (datetime('now'))
  )`,

  // ─── Export Audit ──────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS export_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    exported_at TEXT DEFAULT (datetime('now')),
    type        TEXT,
    -- full, partial, doctor_summary
    encrypted   INTEGER DEFAULT 1,
    note        TEXT
  )`,
];

export const SEED_DEFAULTS = `
  INSERT OR IGNORE INTO app_settings (id) VALUES (1);
  INSERT OR IGNORE INTO security_config (id) VALUES (1);
`;

export const INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(date)`,
  `CREATE INDEX IF NOT EXISTS idx_cycles_start ON cycles(start_date)`,
  `CREATE INDEX IF NOT EXISTS idx_symptoms_date ON symptoms(date)`,
  `CREATE INDEX IF NOT EXISTS idx_sex_logs_date ON sex_logs(date)`,
  `CREATE INDEX IF NOT EXISTS idx_pregnancy_date ON pregnancy_log(date)`,
];

// Migration: add mood_tags to daily_logs
export const MIGRATION_V2 = `
  ALTER TABLE daily_logs ADD COLUMN mood_tags TEXT DEFAULT NULL;
`;
