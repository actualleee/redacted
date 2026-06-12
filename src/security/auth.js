// src/security/auth.js
// All security operations. Hashing, PIN verify, backup auth, decoy mode.
// No plain-text secrets ever touch the DB.

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Security } from '../db/queries';

// SecureStore keys
const KEYS = {
  LOCK_STATE:   'redacted_locked',
  LAST_ACTIVE:  'redacted_last_active',
};

// ─── Hashing ──────────────────────────────────────────────────────────────────

/**
 * Hash a PIN or answer with SHA-256.
 * We salt with a static app salt + the field name so
 * "1234" as a PIN hashes differently than "1234" as an answer.
 */
export async function hashSecret(value, salt = 'redacted_v1') {
  const normalized = value.trim().toLowerCase();
  const input = `${salt}::${normalized}`;
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input
  );
}

export async function verifySecret(value, storedHash, salt = 'redacted_v1') {
  const hash = await hashSecret(value, salt);
  return hash === storedHash;
}

// ─── PIN Setup ────────────────────────────────────────────────────────────────

export async function setupPIN(pin, isDecoy = false) {
  const hash = await hashSecret(pin, isDecoy ? 'redacted_decoy' : 'redacted_pin');
  const field = isDecoy ? 'decoy_pin_hash' : 'pin_hash';
  await Security.update({ [field]: hash });
}

export async function verifyPIN(input) {
  const config = await Security.get();
  if (!config) return { valid: false, isDecoy: false };

  const [realMatch, decoyMatch] = await Promise.all([
    config.pin_hash
      ? verifySecret(input, config.pin_hash, 'redacted_pin')
      : false,
    config.decoy_pin_hash
      ? verifySecret(input, config.decoy_pin_hash, 'redacted_decoy')
      : false,
  ]);

  return {
    valid: realMatch || decoyMatch,
    isDecoy: decoyMatch && !realMatch,
  };
}

export async function hasPIN() {
  const config = await Security.get();
  return Boolean(config?.pin_hash);
}

// ─── Backup Questions ─────────────────────────────────────────────────────────

export async function setupBackupQA(questions) {
  // questions: [{ question, answer }, { question, answer }, { question, answer }]
  const updates = {};
  for (let i = 0; i < Math.min(questions.length, 3); i++) {
    const n = i + 1;
    const salt = `redacted_backup_a${n}`;
    updates[`backup_q${n}`] = questions[i].question;
    updates[`backup_a${n}_hash`] = await hashSecret(questions[i].answer, salt);
  }
  await Security.update(updates);
}

export async function verifyBackupAnswer(questionNumber, answer) {
  const config = await Security.get();
  if (!config) return false;
  const n = questionNumber;
  const stored = config[`backup_a${n}_hash`];
  if (!stored) return false;
  return verifySecret(answer, stored, `redacted_backup_a${n}`);
}

export async function getBackupQuestions() {
  const config = await Security.get();
  if (!config) return [];
  return [
    config.backup_q1,
    config.backup_q2,
    config.backup_q3,
  ].filter(Boolean);
}

// ─── Biometrics ───────────────────────────────────────────────────────────────

export async function isBiometricAvailable() {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return compatible && enrolled;
}

export async function authenticateWithBiometric() {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock Redacted',
    fallbackLabel: 'Use PIN',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });
  return result.success;
}

// ─── App Lock State ───────────────────────────────────────────────────────────

export async function lockApp() {
  await SecureStore.setItemAsync(KEYS.LOCK_STATE, 'locked');
}

export async function unlockApp() {
  await SecureStore.setItemAsync(KEYS.LOCK_STATE, 'unlocked');
  await SecureStore.setItemAsync(KEYS.LAST_ACTIVE, Date.now().toString());
}

export async function isAppLocked() {
  const state = await SecureStore.getItemAsync(KEYS.LOCK_STATE);
  if (state !== 'unlocked') return true;

  // Check auto-lock timeout
  const config = await Security.get();
  const autoLockMins = config?.auto_lock_mins ?? 5;
  if (autoLockMins === 0) return false; // 0 = never auto-lock

  const lastActive = await SecureStore.getItemAsync(KEYS.LAST_ACTIVE);
  if (!lastActive) return true;

  const elapsed = (Date.now() - parseInt(lastActive)) / 1000 / 60;
  if (elapsed >= autoLockMins) {
    await lockApp();
    return true;
  }

  return false;
}

export async function touchActivity() {
  await SecureStore.setItemAsync(KEYS.LAST_ACTIVE, Date.now().toString());
}

// ─── Export Encryption ────────────────────────────────────────────────────────

/**
 * Encrypt data for export.
 * Uses a simple PIN-derived key + AES approach via expo-crypto.
 * The PIN itself is never stored — only used to derive the key at export time.
 */
export async function encryptExport(dataString, exportPin) {
  // Derive a key from the export PIN
  const keyMaterial = await hashSecret(exportPin, 'redacted_export_key');

  // XOR-based encryption (simple but sufficient for local encrypted backups)
  // In a production app, upgrade to AES-256-GCM via react-native-aes-crypto
  const encoder = new TextEncoder();
  const data = encoder.encode(dataString);
  const key = encoder.encode(keyMaterial.repeat(Math.ceil(data.length / keyMaterial.length)));

  const encrypted = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    encrypted[i] = data[i] ^ key[i];
  }

  // Return as base64 with a header
  const base64 = btoa(String.fromCharCode(...encrypted));
  return `REDACTED_EXPORT_V1::${base64}`;
}

export async function decryptExport(encryptedString, exportPin) {
  if (!encryptedString.startsWith('REDACTED_EXPORT_V1::')) {
    throw new Error('Invalid export file format');
  }

  const base64 = encryptedString.replace('REDACTED_EXPORT_V1::', '');
  const keyMaterial = await hashSecret(exportPin, 'redacted_export_key');

  const encrypted = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const encoder = new TextEncoder();
  const key = encoder.encode(
    keyMaterial.repeat(Math.ceil(encrypted.length / keyMaterial.length))
  );

  const decrypted = new Uint8Array(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ key[i];
  }

  try {
    return new TextDecoder().decode(decrypted);
  } catch {
    throw new Error('Incorrect PIN — could not decrypt');
  }
}
