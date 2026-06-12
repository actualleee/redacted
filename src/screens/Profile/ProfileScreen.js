import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTheme, radius, spacing } from '../../theme';
import { Settings } from '../../db/queries';
import { setupPIN, isBiometricAvailable } from '../../security/auth';
import { Security } from '../../db/queries';
import { exportData, exportDoctorSummary } from '../../security/exportImport';
import { useAppStore } from '../../stores';
import LegalModal from '../Legal/LegalModal';
import { getDB } from '../../db/database';

export default function ProfileScreen() {
  const { settings, updateSettings, setSettings, darkMode, setDarkMode } = useAppStore();
  const theme = getTheme(darkMode);
  const C = theme.colors;
  const sh = theme.shadows;

  const [changePinModal, setChangePinModal] = useState(false);
  const [exportModal, setExportModal] = useState(false);
  const [legalModal, setLegalModal] = useState(false);
  const [exportPin, setExportPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioOn, setBioOn] = useState(true);

  React.useEffect(() => {
    (async () => {
      setBioAvailable(await isBiometricAvailable());
      try { const cfg = await Security.get(); setBioOn(cfg?.biometric_on !== 0); } catch {}
    })();
  }, []);

  async function toggleBiometric(val) {
    setBioOn(val);
    await Security.update({ biometric_on: val ? 1 : 0 });
  }

  const styles = makeStyles(C, sh);

  async function toggleCondition(field, value) {
    await Settings.update({ [field]: value ? 1 : 0 });
    updateSettings({ [field]: value ? 1 : 0 });
  }

  async function handleChangePin() {
    if (newPin.length < 4) { setPinError('PIN must be at least 4 digits'); return; }
    if (newPin !== newPinConfirm) { setPinError("PINs don't match"); return; }
    await setupPIN(newPin);
    setChangePinModal(false); setNewPin(''); setNewPinConfirm(''); setPinError('');
    Alert.alert('Done', 'PIN updated.');
  }

  async function handleExport() {
    if (!exportPin.trim()) return;
    setExporting(true);
    try { await exportData(exportPin, 'full'); setExportModal(false); setExportPin(''); }
    catch (e) { Alert.alert('Export failed', e.message); }
    finally { setExporting(false); }
  }

  async function handleResetData() {
    Alert.alert('Delete all data?',
      'This permanently deletes every log, cycle, and symptom. Cannot be undone.\n\nExport a backup first if you want to keep anything.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete everything', style: 'destructive', onPress: async () => {
          const db = await getDB();
          await db.execAsync(`DELETE FROM symptoms; DELETE FROM sex_logs; DELETE FROM medications; DELETE FROM condition_logs; DELETE FROM conception_tracking; DELETE FROM pregnancy_log; DELETE FROM daily_logs; DELETE FROM cycles; DELETE FROM insights_cache; DELETE FROM export_log; UPDATE app_settings SET condition_endo=0,condition_pcos=0,condition_ttc=0,pregnancy_mode=0,onboarding_done=0 WHERE id=1;`);
          const updated = await Settings.get();
          setSettings(updated);
          Alert.alert('Done', 'All data deleted.');
        }},
      ]
    );
  }

  function Row({ label, sub, onPress, right, danger }) {
    return (
      <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
        <View style={styles.rowLeft}>
          <Text style={[styles.rowLabel, danger && { color: C.error }]}>{label}</Text>
          {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
        </View>
        {right || (onPress ? <Text style={styles.rowArrow}>›</Text> : null)}
      </TouchableOpacity>
    );
  }

  function Section({ title, children }) {
    return (
      <View style={styles.section}>
        {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
        <View style={styles.sectionCard}>{children}</View>
      </View>
    );
  }

  if (!settings) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: C.textPrimary }]}>Settings</Text>

        <Section title="Appearance">
          <Row label="Dark Mode" sub={darkMode ? "Warm dark — forest at night" : "Light — warm cream"} right={
            <Switch value={darkMode} onValueChange={setDarkMode}
              trackColor={{ true: C.primary, false: C.border }} thumbColor="#fff" />
          } />
        </Section>

        <Section title="My Conditions">
          <Row label="Endometriosis" sub="Deep pain tracking, endo-specific tips" right={
            <Switch value={!!settings.condition_endo} onValueChange={v => toggleCondition('condition_endo', v)} trackColor={{ true: C.primary, false: C.border }} thumbColor="#fff" />
          } />
          <Row label="PCOS" sub="Irregular cycles, androgen symptoms, tips" right={
            <Switch value={!!settings.condition_pcos} onValueChange={v => toggleCondition('condition_pcos', v)} trackColor={{ true: C.primary, false: C.border }} thumbColor="#fff" />
          } />
          <Row label="Trying to Conceive" sub="Fertile window, BBT, conception" right={
            <Switch value={!!settings.condition_ttc} onValueChange={v => toggleCondition('condition_ttc', v)} trackColor={{ true: C.primary, false: C.border }} thumbColor="#fff" />
          } />
          <Row label="Pregnancy Mode" sub="Gestational tracking, kicks" right={
            <Switch value={!!settings.pregnancy_mode} onValueChange={v => toggleCondition('pregnancy_mode', v)} trackColor={{ true: C.primary, false: C.border }} thumbColor="#fff" />
          } />
        </Section>

        <Section title="Security">
          <Row label="Change PIN" sub="Update your lock screen PIN" onPress={() => setChangePinModal(true)} />
          {bioAvailable && (
            <Row label="Fingerprint / Face Unlock" sub="Use biometrics to unlock the app" right={
              <Switch value={bioOn} onValueChange={toggleBiometric}
                trackColor={{ true: C.primary, false: C.border }} thumbColor="#fff" />
            } />
          )}
        </Section>

        <Section title="Data">
          <Row label="Export Backup" sub="Encrypted .rdx — save to cloud or phone" onPress={() => setExportModal(true)} />
          <Row label="Doctor Summary" sub="Plain text report for appointments" onPress={exportDoctorSummary} />
        </Section>

        <Section title="Danger Zone">
          <Row label="🗑  Delete all my data" sub="Wipe everything and start fresh" onPress={handleResetData} danger />
        </Section>

        <Section>
          <Row label="Privacy & Legal" sub="Privacy policy, medical disclaimer, licenses" onPress={() => setLegalModal(true)} />
          <Row label="Redacted" sub="v1.0 · No servers · No tracking · Ever" />
        </Section>
        <View style={{ height: 80 }} />
      </ScrollView>

      <Modal visible={changePinModal} transparent animationType="slide" onRequestClose={() => setChangePinModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: C.bgCard }]}>
            <Text style={[styles.modalTitle, { color: C.textPrimary }]}>Change PIN</Text>
            <TextInput style={[styles.input, { backgroundColor: C.bgInput, borderColor: C.border, color: C.textPrimary }]} placeholder="New PIN (4-6 digits)" placeholderTextColor={C.textMuted} value={newPin} onChangeText={setNewPin} keyboardType="number-pad" secureTextEntry maxLength={6} />
            <TextInput style={[styles.input, { backgroundColor: C.bgInput, borderColor: C.border, color: C.textPrimary }]} placeholder="Confirm new PIN" placeholderTextColor={C.textMuted} value={newPinConfirm} onChangeText={setNewPinConfirm} keyboardType="number-pad" secureTextEntry maxLength={6} />
            {pinError ? <Text style={{ color: C.error, fontSize: 13, marginBottom: spacing.sm }}>{pinError}</Text> : null}
            <TouchableOpacity style={[styles.btn, { backgroundColor: C.primary }]} onPress={handleChangePin}>
              <Text style={styles.btnText}>Update PIN</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setChangePinModal(false); setPinError(''); }} style={styles.cancelBtn}>
              <Text style={{ color: C.textMuted, fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={exportModal} transparent animationType="slide" onRequestClose={() => setExportModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: C.bgCard }]}>
            <Text style={[styles.modalTitle, { color: C.textPrimary }]}>Export Backup</Text>
            <Text style={{ fontSize: 13, color: C.textMuted, marginBottom: spacing.lg, lineHeight: 20 }}>Set a PIN to encrypt your backup. You'll need this to restore.</Text>
            <TextInput style={[styles.input, { backgroundColor: C.bgInput, borderColor: C.border, color: C.textPrimary }]} placeholder="Export PIN" placeholderTextColor={C.textMuted} value={exportPin} onChangeText={setExportPin} secureTextEntry />
            <TouchableOpacity style={[styles.btn, { backgroundColor: C.primary }, exporting && { opacity: 0.5 }]} onPress={handleExport} disabled={exporting}>
              <Text style={styles.btnText}>{exporting ? 'Exporting...' : 'Export & Share'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setExportModal(false); setExportPin(''); }} style={styles.cancelBtn}>
              <Text style={{ color: C.textMuted, fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
          <LegalModal visible={legalModal} onClose={() => setLegalModal(false)} />

      </SafeAreaView>
  );
}

const makeStyles = (C, sh) => StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md },
  title: { fontSize: 28, fontWeight: '700', marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: C.textMuted, marginBottom: spacing.sm, fontWeight: '600' },
  sectionCard: { backgroundColor: C.bgCard, borderRadius: radius.lg, overflow: 'hidden', ...sh.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  rowLeft: { flex: 1, marginRight: spacing.md },
  rowLabel: { fontSize: 15, color: C.textPrimary, fontWeight: '500' },
  rowSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  rowArrow: { fontSize: 20, color: C.textMuted },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: C.overlay },
  modalSheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: spacing.sm },
  input: { borderRadius: radius.md, padding: spacing.md, fontSize: 16, borderWidth: 1.5, marginBottom: spacing.md },
  btn: { borderRadius: radius.full, paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', padding: spacing.sm },
});
