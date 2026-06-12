// src/screens/Onboarding/OnboardingScreen.js
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Animated, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, spacing, radius, typography } from '../../theme';
import { Settings } from '../../db/queries';
import { setupPIN, setupBackupQA } from '../../security/auth';
import { useAppStore } from '../../stores';

const STEPS = ['welcome', 'conditions', 'pin', 'backup', 'done'];

const BACKUP_QUESTIONS = [
  "What is your childhood nickname?",
  "What city were you born in?",
  "What is your oldest sibling's middle name?",
  "What was the name of your first pet?",
  "What street did you grow up on?",
  "What was the make of your first car?",
  "What is your mother's maiden name?",
  "What was your elementary school mascot?",
];

export default function OnboardingScreen() {
  const { setSettings, updateSettings } = useAppStore();
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Conditions
  const [conditions, setConditions] = useState({
    endo: false, pcos: false, ttc: false, pregnancy: false,
  });

  // PIN
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinStep, setPinStep] = useState('enter'); // enter | confirm
  const [pinError, setPinError] = useState('');

  // Backup
  const [backupQA, setBackupQA] = useState([
    { question: BACKUP_QUESTIONS[0], answer: '' },
    { question: BACKUP_QUESTIONS[3], answer: '' },
    { question: BACKUP_QUESTIONS[4], answer: '' },
  ]);

  function transition(nextStep) {
    Animated.timing(fadeAnim, {
      toValue: 0, duration: 200, useNativeDriver: true,
    }).start(() => {
      setStep(nextStep);
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 300, useNativeDriver: true,
      }).start();
    });
  }

  function toggleCondition(key) {
    setConditions(c => ({ ...c, [key]: !c[key] }));
  }

  async function handlePinNext() {
    if (pinStep === 'enter') {
      if (pin.length < 4) { setPinError('PIN must be at least 4 digits'); return; }
      setPinError('');
      setPinStep('confirm');
      return;
    }
    if (pin !== pinConfirm) {
      setPinError("PINs don't match");
      setPinConfirm('');
      return;
    }
    await setupPIN(pin);
    setPinError('');
    transition(step + 1);
  }

  async function handleBackupNext() {
    const filled = backupQA.filter(qa => qa.answer.trim().length > 0);
    if (filled.length < 2) {
      return; // need at least 2
    }
    await setupBackupQA(backupQA.filter(qa => qa.answer.trim()));
    transition(step + 1);
  }

  async function handleDone() {
    await Settings.update({
      onboarding_done: 1,
      condition_endo: conditions.endo ? 1 : 0,
      condition_pcos: conditions.pcos ? 1 : 0,
      condition_ttc: conditions.ttc ? 1 : 0,
      pregnancy_mode: conditions.pregnancy ? 1 : 0,
    });
    const updated = await Settings.get();
    setSettings(updated);
  }

  const currentStep = STEPS[step];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Progress dots */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i <= step && styles.dotActive]} />
          ))}
        </View>

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>

          {/* ── WELCOME ── */}
          {currentStep === 'welcome' && (
            <View style={styles.step}>
              <Text style={styles.bigDot}>●</Text>
              <Text style={styles.title}>Redacted</Text>
              <Text style={styles.subtitle}>
                Your body. Your data.{'\n'}No one else's business.
              </Text>
              <Text style={styles.body}>
                Everything you log stays on your phone. No servers, no syncing, no ads, no selling your data. Ever.
              </Text>
              <Text style={[styles.body, { marginTop: spacing.md, color: colors.textMuted }]}>
                Built for people who are done with apps that profit from their cycles.
              </Text>
              <TouchableOpacity style={styles.btn} onPress={() => transition(step + 1)}>
                <Text style={styles.btnText}>Let's go →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── CONDITIONS ── */}
          {currentStep === 'conditions' && (
            <View style={styles.step}>
              <Text style={styles.title}>What are you{'\n'}tracking?</Text>
              <Text style={styles.body}>
                Select everything that applies. This shapes what you see and what we track for you.
              </Text>
              <View style={styles.conditionGrid}>
                {[
                  { key: 'endo', emoji: '🔴', label: 'Endometriosis', desc: 'Pain tracking, inflammation, flare patterns' },
                  { key: 'pcos', emoji: '🟡', label: 'PCOS', desc: 'Cycle irregularity, hirsutism, weight changes' },
                  { key: 'ttc', emoji: '🌿', label: 'Trying to Conceive', desc: 'Fertile window, BBT, conception likelihood' },
                  { key: 'pregnancy', emoji: '🌙', label: 'Pregnant', desc: 'Gestational tracking, kicks, appointments' },
                ].map(({ key, emoji, label, desc }) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.conditionCard, conditions[key] && styles.conditionCardActive]}
                    onPress={() => toggleCondition(key)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.conditionEmoji}>{emoji}</Text>
                    <Text style={[styles.conditionLabel, conditions[key] && { color: colors.primary }]}>
                      {label}
                    </Text>
                    <Text style={styles.conditionDesc}>{desc}</Text>
                    {conditions[key] && (
                      <Text style={styles.conditionCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.btn} onPress={() => transition(step + 1)}>
                <Text style={styles.btnText}>
                  {Object.values(conditions).some(Boolean) ? 'Next →' : 'Skip for now →'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── PIN ── */}
          {currentStep === 'pin' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.step}>
                <Text style={styles.title}>
                  {pinStep === 'enter' ? 'Set your PIN' : 'Confirm your PIN'}
                </Text>
                <Text style={styles.body}>
                  {pinStep === 'enter'
                    ? 'This locks the app. Only you can open it.'
                    : 'Enter the same PIN again to confirm.'}
                </Text>

                <View style={styles.pinDots}>
                  {[...Array(6)].map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.pinDot,
                        i < (pinStep === 'enter' ? pin : pinConfirm).length && styles.pinDotFilled
                      ]}
                    />
                  ))}
                </View>

                {pinError ? <Text style={styles.errorText}>{pinError}</Text> : null}

                {/* Keypad */}
                <View style={styles.keypad}>
                  {[['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']].map((row, ri) => (
                    <View key={ri} style={styles.keyRow}>
                      {row.map((key, ki) => (
                        <TouchableOpacity
                          key={ki}
                          style={[styles.key, key === '' && { opacity: 0 }]}
                          onPress={() => {
                            if (key === '') return;
                            const current = pinStep === 'enter' ? pin : pinConfirm;
                            const setter = pinStep === 'enter' ? setPin : setPinConfirm;
                            if (key === '⌫') { setter(current.slice(0, -1)); return; }
                            if (current.length < 6) setter(current + key);
                          }}
                          disabled={key === ''}
                        >
                          <Text style={styles.keyText}>{key}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.btn, (pinStep === 'enter' ? pin : pinConfirm).length < 4 && styles.btnDisabled]}
                  onPress={handlePinNext}
                >
                  <Text style={styles.btnText}>
                    {pinStep === 'enter' ? 'Next →' : 'Set PIN →'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.skipBtn}
                  onPress={() => transition(step + 1)}
                >
                  <Text style={styles.skipText}>Skip PIN setup (not recommended)</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* ── BACKUP QUESTIONS ── */}
          {currentStep === 'backup' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.step}>
                <Text style={styles.title}>Backup questions</Text>
                <Text style={styles.body}>
                  If you forget your PIN, these let you back in. Answer honestly — you'll need to match these exactly.
                </Text>

                {backupQA.map((qa, i) => (
                  <View key={i} style={styles.qaBlock}>
                    <Text style={styles.qaLabel}>Question {i + 1}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {BACKUP_QUESTIONS.map((q, qi) => (
                        <TouchableOpacity
                          key={qi}
                          style={[styles.qPill, qa.question === q && styles.qPillActive]}
                          onPress={() => {
                            const updated = [...backupQA];
                            updated[i] = { ...updated[i], question: q };
                            setBackupQA(updated);
                          }}
                        >
                          <Text style={[styles.qPillText, qa.question === q && { color: colors.primary }]}>
                            {q}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <TextInput
                      style={styles.answerInput}
                      placeholder="Your answer..."
                      placeholderTextColor={colors.textMuted}
                      value={qa.answer}
                      onChangeText={text => {
                        const updated = [...backupQA];
                        updated[i] = { ...updated[i], answer: text };
                        setBackupQA(updated);
                      }}
                      secureTextEntry
                    />
                  </View>
                ))}

                <TouchableOpacity style={styles.btn} onPress={handleBackupNext}>
                  <Text style={styles.btnText}>Next →</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.skipBtn} onPress={() => transition(step + 1)}>
                  <Text style={styles.skipText}>Skip (PIN only)</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* ── DONE ── */}
          {currentStep === 'done' && (
            <View style={styles.step}>
              <Text style={styles.bigDot}>●</Text>
              <Text style={styles.title}>You're all set.</Text>
              <Text style={styles.body}>
                Redacted is ready. Start logging whenever you're ready — the more you track, the smarter it gets.
              </Text>
              <View style={styles.featureList}>
                {[
                  '🌑  Daily logging — flow, mood, symptoms, more',
                  '📅  Cycle calendar with phase predictions',
                  '✦   Pattern insights after 2–3 cycles',
                  '🔒  Everything stays on your phone',
                ].map((f, i) => (
                  <Text key={i} style={styles.featureItem}>{f}</Text>
                ))}
              </View>
              <TouchableOpacity style={styles.btn} onPress={handleDone}>
                <Text style={styles.btnText}>Enter Redacted →</Text>
              </TouchableOpacity>
            </View>
          )}

        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  dots: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 6, paddingTop: spacing.md,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: { backgroundColor: colors.primary, width: 18 },
  content: { flex: 1 },
  step: {
    flex: 1, paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl, paddingBottom: spacing.xl,
  },
  bigDot: { fontSize: 48, color: colors.primary, marginBottom: spacing.md },
  title: {
    fontFamily: 'serif', fontSize: 32, fontWeight: 'bold',
    color: colors.textPrimary, marginBottom: spacing.md, lineHeight: 40,
  },
  subtitle: {
    fontSize: 20, color: colors.textSecondary,
    marginBottom: spacing.md, lineHeight: 28,
  },
  body: { fontSize: 15, color: colors.textSecondary, lineHeight: 23, marginBottom: spacing.sm },
  btn: {
    backgroundColor: colors.primary, borderRadius: radius.full,
    paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.xl,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skipBtn: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
  skipText: { color: colors.textMuted, fontSize: 13 },
  conditionGrid: { gap: spacing.sm, marginTop: spacing.md },
  conditionCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  conditionCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryDim + '33' },
  conditionEmoji: { fontSize: 22, marginBottom: 4 },
  conditionLabel: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  conditionDesc: { fontSize: 13, color: colors.textMuted },
  conditionCheck: { position: 'absolute', top: spacing.md, right: spacing.md, color: colors.primary, fontSize: 18 },
  pinDots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginVertical: spacing.xl },
  pinDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: colors.textMuted },
  pinDotFilled: { backgroundColor: colors.primary, borderColor: colors.primary },
  errorText: { color: colors.error, textAlign: 'center', marginBottom: spacing.sm, fontSize: 14 },
  keypad: { gap: spacing.sm, marginBottom: spacing.md },
  keyRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  key: {
    flex: 1, aspectRatio: 1.6, backgroundColor: colors.bgCard,
    borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  keyText: { fontSize: 22, color: colors.textPrimary, fontWeight: '500' },
  qaBlock: { marginBottom: spacing.lg },
  qaLabel: { fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm },
  qPill: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    backgroundColor: colors.bgCard, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm,
  },
  qPillActive: { borderColor: colors.primary },
  qPillText: { fontSize: 12, color: colors.textSecondary },
  answerInput: {
    backgroundColor: colors.bgInput, borderRadius: radius.md,
    padding: spacing.md, color: colors.textPrimary, fontSize: 15,
    borderWidth: 1, borderColor: colors.border, marginTop: spacing.sm,
  },
  featureList: { gap: spacing.sm, marginTop: spacing.lg },
  featureItem: { fontSize: 15, color: colors.textSecondary, lineHeight: 24 },
});
