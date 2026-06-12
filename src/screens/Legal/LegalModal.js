// src/screens/Legal/LegalModal.js
// Privacy Policy, Medical Disclaimer, and Open-Source Licenses.
// Plain text, scrollable, themed. Opened from Profile.
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTheme, spacing, radius } from '../../theme';
import { useAppStore } from '../../stores';

const APP_NAME = 'Redacted';
const LAST_UPDATED = 'June 2026';

export default function LegalModal({ visible, onClose, initialSection = 'privacy' }) {
  const { darkMode } = useAppStore();
  const C = getTheme(darkMode).colors;
  const s = makeStyles(C);

  const H = ({ children }) => <Text style={s.h2}>{children}</Text>;
  const P = ({ children }) => <Text style={s.p}>{children}</Text>;
  const B = ({ children }) => <Text style={s.bullet}>{`•  ${children}`}</Text>;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <Text style={s.title}>Privacy & Legal</Text>
          <TouchableOpacity style={s.doneBtn} onPress={onClose}>
            <Text style={s.doneText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          {/* ── PRIVACY POLICY ── */}
          <Text style={s.h1}>Privacy Policy</Text>
          <Text style={s.meta}>Last updated {LAST_UPDATED}</Text>
          <P>{APP_NAME} is built privacy-first. The short version: your data never leaves your device, and there is no one on the other end to receive it.</P>

          <H>What we collect</H>
          <P>Nothing. {APP_NAME} has no servers, no accounts, and no analytics. We do not collect, transmit, sell, or share any information about you — because there is no mechanism in the app to do so.</P>

          <H>Where your data lives</H>
          <P>Everything you log — cycles, symptoms, moods, intimacy, notes, and settings — is stored only in a private database on this device. It is not uploaded anywhere and is not readable by other apps.</P>

          <H>Backups you control</H>
          <P>You can create an encrypted backup file and choose where it goes (your own cloud storage, a file, another device). That file is encrypted with a passphrase only you know. We never receive it and cannot read it. If you lose the passphrase, the backup cannot be recovered.</P>

          <H>Biometrics</H>
          <P>If you enable fingerprint or face unlock, that check is performed entirely by your device's operating system. {APP_NAME} only receives a yes/no result and never sees or stores your biometric data.</P>

          <H>Deleting your data</H>
          <P>You can erase everything at any time from Settings → Delete all my data. Uninstalling the app also removes all locally stored data permanently.</P>

          <H>Children</H>
          <P>{APP_NAME} is intended for users who are old enough to manage their own reproductive health information and is not directed at children under 13.</P>

          <H>Changes</H>
          <P>If this policy changes, the updated version will appear here with a new date.</P>

          <View style={s.divider} />

          {/* ── MEDICAL DISCLAIMER ── */}
          <Text style={s.h1}>Medical Disclaimer</Text>
          <P>{APP_NAME} is an informational and educational tool. It is not a medical device, and it does not provide medical advice, diagnosis, or treatment.</P>

          <H>Predictions are estimates</H>
          <P>Phase and period predictions are calculated from the data you log and from general statistical averages. Real cycles vary from month to month. Estimates may be wrong, especially early on or with irregular cycles.</P>

          <H>Not birth control</H>
          <Text style={s.warn}>Do not use {APP_NAME} as contraception or as a method to prevent or achieve pregnancy. Fertile-window and ovulation estimates are not reliable for those purposes.</Text>

          <H>General health information</H>
          <P>Any notes about symptoms (for example, discharge or odor) are general educational information, not a diagnosis. They cannot tell you what is happening in your body.</P>

          <H>When to seek care</H>
          <P>Always consult a qualified healthcare provider for medical questions or concerns, and seek prompt care for severe, unusual, or persistent symptoms. Never delay seeking medical advice because of something you read in this app.</P>

          <View style={s.divider} />

          {/* ── LICENSES ── */}
          <Text style={s.h1}>Open-Source Licenses</Text>
          <P>{APP_NAME} is released under the MIT License and is built with open-source software, including:</P>
          <B>React Native &amp; React (MIT)</B>
          <B>Expo and Expo modules (MIT)</B>
          <B>React Navigation (MIT)</B>
          <B>date-fns (MIT)</B>
          <B>zustand (MIT)</B>
          <B>@noble/ciphers &amp; @noble/hashes (MIT) — used for backup encryption</B>
          <P>Full license texts are available from each project's repository. We're grateful to their maintainers.</P>

          <View style={{ height: 50 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  doneBtn: { backgroundColor: C.primary, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  doneText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  body: { padding: spacing.lg },
  h1: { fontSize: 22, fontWeight: '800', color: C.textPrimary, marginTop: spacing.md, marginBottom: 4 },
  h2: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginTop: spacing.lg, marginBottom: 4 },
  meta: { fontSize: 12, color: C.textMuted, fontStyle: 'italic', marginBottom: spacing.md },
  p: { fontSize: 14, color: C.textSecondary, lineHeight: 21, marginBottom: spacing.sm },
  bullet: { fontSize: 14, color: C.textSecondary, lineHeight: 21, marginLeft: spacing.sm, marginBottom: 2 },
  warn: { fontSize: 14, color: C.textPrimary, lineHeight: 21, marginBottom: spacing.sm, fontWeight: '600' },
  divider: { height: 1, backgroundColor: C.border, marginVertical: spacing.xl },
});
