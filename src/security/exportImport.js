// src/security/exportImport.js
// Full encrypted export / import.
// Everything in one JSON blob, encrypted with user's PIN.

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import { dbAll, dbGet } from '../db/database';
import { encryptExport, decryptExport } from './auth';
import { ExportLog } from '../db/queries';
import { InsightsCache } from '../db/queries';

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportData(exportPin, type = 'full') {
  const data = await gatherData(type);
  const json = JSON.stringify(data, null, 0); // compact

  const encrypted = await encryptExport(json, exportPin);

  const filename = `redacted_backup_${format(new Date(), 'yyyyMMdd_HHmm')}.rdx`;
  const path = `${FileSystem.documentDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(path, encrypted, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  await ExportLog.record(type, 1, filename);

  // Open share sheet
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'application/octet-stream',
      dialogTitle: 'Save your Redacted backup',
      UTI: 'public.data',
    });
  }

  return { success: true, filename };
}

async function gatherData(type) {
  const [
    settings,
    cycles,
    dailyLogs,
    symptoms,
    sexLogs,
    medications,
    conditionLogs,
    pregnancyLogs,
    conceptionTracking,
  ] = await Promise.all([
    dbGet('SELECT * FROM app_settings WHERE id = 1'),
    dbAll('SELECT * FROM cycles ORDER BY start_date'),
    dbAll('SELECT * FROM daily_logs ORDER BY date'),
    dbAll('SELECT * FROM symptoms ORDER BY date'),
    dbAll('SELECT * FROM sex_logs ORDER BY date'),
    dbAll('SELECT * FROM medications ORDER BY date'),
    dbAll('SELECT * FROM condition_logs ORDER BY date'),
    dbAll('SELECT * FROM pregnancy_log ORDER BY date'),
    dbAll('SELECT * FROM conception_tracking'),
  ]);

  const exportData = {
    version: 1,
    exported_at: new Date().toISOString(),
    type,
    settings: type === 'full' ? settings : null,
    data: {
      cycles,
      daily_logs: dailyLogs,
      symptoms,
      sex_logs: sexLogs,
      medications,
      condition_logs: conditionLogs,
      pregnancy_logs: pregnancyLogs,
      conception_tracking: conceptionTracking,
    },
  };

  // Strip security config — never exported
  return exportData;
}

// ─── Import ───────────────────────────────────────────────────────────────────

export async function importData(fileUri, exportPin) {
  let raw;
  try {
    raw = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch {
    throw new Error('Could not read backup file');
  }

  let json;
  try {
    json = await decryptExport(raw, exportPin);
  } catch {
    throw new Error('Incorrect PIN or corrupted backup');
  }

  let backup;
  try {
    backup = JSON.parse(json);
  } catch {
    throw new Error('Backup file is corrupted');
  }

  if (!backup.version || !backup.data) {
    throw new Error('Invalid backup format');
  }

  await restoreData(backup);
  await InsightsCache.invalidateAll();

  return {
    success: true,
    exported_at: backup.exported_at,
    type: backup.type,
  };
}

async function restoreData(backup) {
  const { data } = backup;
  const db = await (await import('../db/database')).getDB();

  await db.withTransactionAsync(async () => {
    // Clear existing (except security config — never touched)
    await db.execAsync(`
      DELETE FROM symptoms;
      DELETE FROM sex_logs;
      DELETE FROM medications;
      DELETE FROM condition_logs;
      DELETE FROM conception_tracking;
      DELETE FROM pregnancy_log;
      DELETE FROM daily_logs;
      DELETE FROM cycles;
    `);

    // Restore cycles
    for (const c of data.cycles ?? []) {
      await db.runAsync(
        `INSERT OR REPLACE INTO cycles
          (id, start_date, end_date, cycle_length, period_length, notes, is_predicted, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.id, c.start_date, c.end_date, c.cycle_length, c.period_length,
         c.notes, c.is_predicted, c.created_at, c.updated_at]
      );
    }

    // Restore daily logs
    for (const l of data.daily_logs ?? []) {
      await db.runAsync(
        `INSERT OR REPLACE INTO daily_logs
          (id, date, cycle_id, flow, mood, energy, pain_level, bbt, cervical_mucus, notes, mood_tags, discharge, odor, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [l.id, l.date, l.cycle_id, l.flow, l.mood, l.energy, l.pain_level,
         l.bbt, l.cervical_mucus, l.notes, l.mood_tags ?? null, l.discharge ?? null, l.odor ?? null,
         l.created_at, l.updated_at]
      );
    }

    // Restore symptoms
    for (const s of data.symptoms ?? []) {
      await db.runAsync(
        `INSERT OR REPLACE INTO symptoms (id, log_id, date, symptom, severity, location)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [s.id, s.log_id, s.date, s.symptom, s.severity, s.location]
      );
    }

    // Restore sex logs
    for (const s of data.sex_logs ?? []) {
      await db.runAsync(
        `INSERT OR REPLACE INTO sex_logs
          (id, log_id, date, protected, contraceptive, initiated_by, satisfaction, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.id, s.log_id, s.date, s.protected, s.contraceptive,
         s.initiated_by, s.satisfaction, s.notes]
      );
    }

    // Restore medications
    for (const m of data.medications ?? []) {
      await db.runAsync(
        `INSERT OR REPLACE INTO medications (id, log_id, date, name, dose, taken, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [m.id, m.log_id, m.date, m.name, m.dose, m.taken, m.notes]
      );
    }

    // Restore pregnancy logs
    for (const p of data.pregnancy_logs ?? []) {
      await db.runAsync(
        `INSERT OR REPLACE INTO pregnancy_log (id, date, lmp_date, edd, gestational_week,
          gestational_day, weight_kg, belly_cm, kicks_today, nausea, fatigue, heartburn,
          swelling, spotting, mood, notes, appointment_date, appointment_notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.date, p.lmp_date, p.edd, p.gestational_week, p.gestational_day,
         p.weight_kg, p.belly_cm, p.kicks_today, p.nausea, p.fatigue, p.heartburn,
         p.swelling, p.spotting, p.mood, p.notes, p.appointment_date,
         p.appointment_notes, p.created_at]
      );
    }
  });
}

// ─── Doctor PDF Export (plaintext, no encryption) ─────────────────────────────

export async function exportDoctorSummary() {
  const cycles = await dbAll(
    `SELECT * FROM cycles WHERE is_predicted = 0 ORDER BY start_date DESC LIMIT 6`
  );
  const symptoms = await dbAll(
    `SELECT symptom, COUNT(*) as count, AVG(severity) as avg_sev
     FROM symptoms
     WHERE date >= date('now', '-3 months')
     GROUP BY symptom ORDER BY count DESC`
  );
  const bbt = await dbAll(
    `SELECT date, bbt FROM daily_logs
     WHERE bbt IS NOT NULL AND date >= date('now', '-90 days')
     ORDER BY date`
  );

  const lines = [
    'REDACTED — HEALTH SUMMARY EXPORT',
    `Generated: ${new Date().toLocaleDateString()}`,
    '',
    '── RECENT CYCLES ──',
    ...cycles.map(c =>
      `${c.start_date} → ${c.end_date ?? 'ongoing'} (${c.cycle_length ?? '?'}d)`
    ),
    '',
    '── TOP SYMPTOMS (last 3 months) ──',
    ...symptoms.map(s =>
      `${s.symptom}: ${s.count}x, avg severity ${s.avg_sev?.toFixed(1)}`
    ),
    '',
    '── BBT READINGS ──',
    ...bbt.map(b => `${b.date}: ${b.bbt}°C`),
  ];

  const text = lines.join('\n');
  const filename = `redacted_doctor_${format(new Date(), 'yyyyMMdd')}.txt`;
  const path = `${FileSystem.documentDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(path, text);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'text/plain',
      dialogTitle: 'Share health summary with doctor',
    });
  }

  return { success: true, filename };
}
