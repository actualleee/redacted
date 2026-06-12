// src/screens/Lock/LockScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius } from '../../theme';
import { verifyPIN, authenticateWithBiometric, isBiometricAvailable,
         unlockApp } from '../../security/auth';
import { Security } from '../../db/queries';
import { useAppStore } from '../../stores';

const MAX_PIN = 6;
const MIN_PIN = 4;

export default function LockScreen() {
  const { colors } = useTheme();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [hasBiometric, setHasBiometric] = useState(false);

  const { setLocked, setDecoyMode } = useAppStore();
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const styles = makeStyles(colors);

  useEffect(() => { checkBiometric(); }, []);

  async function checkBiometric() {
    const available = await isBiometricAvailable();
    let enabled = true;
    try {
      const cfg = await Security.get();
      // If the column exists and is explicitly 0, respect that; otherwise default on
      enabled = cfg?.biometric_on !== 0;
    } catch {}
    const show = available && enabled;
    setHasBiometric(show);
    if (show) tryBiometric();
  }

  async function tryBiometric() {
    try {
      const success = await authenticateWithBiometric();
      if (success) handleUnlock(false);
    } catch {}
  }

  function handleKey(key) {
    if (pin.length >= MAX_PIN) return;
    setPin(pin + key);
    setError('');
  }

  function handleDelete() {
    setPin(p => p.slice(0, -1));
    setError('');
  }

  async function submitPin() {
    if (pin.length < MIN_PIN) {
      setError(`PIN is at least ${MIN_PIN} digits`);
      return;
    }
    const { valid, isDecoy } = await verifyPIN(pin);
    if (valid) {
      handleUnlock(isDecoy);
    } else {
      shake();
      setPin('');
      setError('Incorrect PIN');
      Vibration.vibrate(200);
    }
  }

  async function handleUnlock(decoy) {
    await unlockApp();
    setDecoyMode(decoy);
    setLocked(false);
  }

  function shake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }

  const keys = [['1','2','3'],['4','5','6'],['7','8','9'],['bio','0','del']];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.logo}>●</Text>
          <Text style={styles.appName}>REDACTED</Text>
        </View>

        {/* Dots — grow with PIN length, up to 6 */}
        <Animated.View style={[styles.dots, { transform: [{ translateX: shakeAnim }] }]}>
          {[...Array(MAX_PIN)].map((_, i) => (
            <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
          ))}
        </Animated.View>

        <Text style={styles.error}>{error}</Text>

        <View style={styles.keypad}>
          {keys.map((row, ri) => (
            <View key={ri} style={styles.keyRow}>
              {row.map((key) => {
                if (key === 'bio') {
                  return (
                    <TouchableOpacity key="bio" style={styles.key}
                      onPress={hasBiometric ? tryBiometric : undefined} activeOpacity={hasBiometric ? 0.7 : 1}>
                      {hasBiometric && <Text style={styles.keySpecial}>☉</Text>}
                    </TouchableOpacity>
                  );
                }
                if (key === 'del') {
                  return (
                    <TouchableOpacity key="del" style={styles.key} onPress={handleDelete}>
                      <Text style={styles.keySpecial}>⌫</Text>
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity key={key} style={styles.key} onPress={() => handleKey(key)} activeOpacity={0.7}>
                    <Text style={styles.keyText}>{key}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Submit button — works for any PIN length */}
        <TouchableOpacity
          style={[styles.submitBtn, pin.length < MIN_PIN && styles.submitBtnDim]}
          onPress={submitPin}
          disabled={pin.length < MIN_PIN}
          activeOpacity={0.8}
        >
          <Text style={styles.submitText}>Unlock</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  header: { alignItems: 'center', marginBottom: spacing.xxl },
  logo: { fontSize: 40, color: colors.primary, marginBottom: spacing.sm },
  appName: { fontSize: 24, fontWeight: '700', letterSpacing: 4, color: colors.textPrimary },
  dots: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: colors.textMuted },
  dotFilled: { backgroundColor: colors.primary, borderColor: colors.primary },
  error: { fontSize: 13, color: colors.error, height: 20, marginBottom: spacing.lg },
  keypad: { width: '100%', maxWidth: 300, gap: spacing.sm },
  keyRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  key: { flex: 1, aspectRatio: 1.4, backgroundColor: colors.bgCard, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  keyText: { fontSize: 22, fontWeight: '500', color: colors.textPrimary },
  keySpecial: { fontSize: 20, color: colors.textSecondary },
  submitBtn: { marginTop: spacing.lg, backgroundColor: colors.primary, borderRadius: radius.full,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xxl, width: '100%', maxWidth: 300, alignItems: 'center' },
  submitBtnDim: { opacity: 0.4 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
