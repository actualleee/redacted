// src/screens/Today/components/DischargeCard.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { spacing, radius } from '../../../theme';
import { DailyLogs } from '../../../db/queries';
import Toast from '../../../components/ui/Toast';

const DISCHARGE_TYPES = [
  { key: 'dry', label: 'Dry', emoji: '🍂' },
  { key: 'sticky', label: 'Sticky', emoji: '🍯' },
  { key: 'creamy', label: 'Creamy', emoji: '🥛' },
  { key: 'watery', label: 'Watery', emoji: '💧' },
  { key: 'egg_white', label: 'Egg White', emoji: '🥚' },
  { key: 'brown', label: 'Brown', emoji: '🟤' },
  { key: 'thick_white', label: 'Thick / Clumpy', emoji: '🧀' },
  { key: 'grey', label: 'Thin Grey', emoji: '🌫' },
  { key: 'yellow_green', label: 'Yellow / Green', emoji: '🟢' },
];

const ODORS = [
  { key: 'none', label: 'None' },
  { key: 'mild', label: 'Mild' },
  { key: 'fishy', label: 'Fishy' },
  { key: 'foul', label: 'Strong / Foul' },
];

// Info keyed to the SINGLE value that was just changed — never a combination.
// Each message is one flowing paragraph.
const DISCHARGE_INFO = {
  thick_white: "Thick, clumpy white discharge — especially with itching — is commonly linked to a yeast infection. These are super common and easily treated.",
  grey: "Thin grey discharge can be linked to bacterial vaginosis (BV), which is common and usually clears up easily with treatment.",
  yellow_green: "Yellow or green discharge can sometimes be a sign of an infection like trichomoniasis or another STI — worth getting checked to be sure.",
};
const ODOR_INFO = {
  fishy: "A fishy odor is commonly linked to bacterial vaginosis (BV), which is common and usually easy to treat.",
  foul: "A strong or foul odor can sometimes point to an infection — worth getting checked if it sticks around.",
};

export default function DischargeCard({ date, discharge, odor, onUpdate }) {
  const { colors, shadows } = useTheme();
  const styles = makeStyles(colors, shadows);
  const [toast, setToast] = useState(false);
  const [infoText, setInfoText] = useState(null);

  async function selectType(key) {
    const next = discharge === key ? null : key;
    await DailyLogs.update(date, { discharge: next });
    // only trigger from the newly-selected value
    if (next && DISCHARGE_INFO[next]) setInfoText(DISCHARGE_INFO[next]);
    setToast(false); setTimeout(() => setToast(true), 50);
    onUpdate?.();
  }

  async function selectOdor(key) {
    const next = odor === key ? null : key;
    await DailyLogs.update(date, { odor: next });
    if (next && ODOR_INFO[next]) setInfoText(ODOR_INFO[next]);
    setToast(false); setTimeout(() => setToast(true), 50);
    onUpdate?.();
  }

  const flaggedOdor = (k) => k === 'fishy' || k === 'foul';

  return (
    <View style={styles.card}>
      <Text style={styles.label}>DISCHARGE</Text>
      <View style={styles.grid}>
        {DISCHARGE_TYPES.map(d => {
          const active = discharge === d.key;
          return (
            <TouchableOpacity key={d.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => selectType(d.key)} activeOpacity={0.7}>
              <Text style={styles.chipEmoji}>{d.emoji}</Text>
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{d.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.label, { marginTop: spacing.md }]}>ODOR</Text>
      <View style={styles.odorRow}>
        {ODORS.map(o => {
          const active = odor === o.key;
          const flagColor = flaggedOdor(o.key) ? colors.warning : colors.primary;
          return (
            <TouchableOpacity key={o.key}
              style={[styles.odorChip, active && { borderColor: flagColor, backgroundColor: flagColor + '18' }]}
              onPress={() => selectOdor(o.key)} activeOpacity={0.7}>
              <Text style={[styles.odorLabel, active && { color: flagColor, fontWeight: '600' }]}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Toast visible={toast} message="Saved ✓" color={colors.primary} />

      <Modal visible={!!infoText} transparent animationType="fade" onRequestClose={() => setInfoText(null)}>
        <View style={styles.overlay}>
          <View style={styles.infoModal}>
            <Text style={styles.infoFlag}>💛</Text>
            <Text style={styles.infoTitle}>A gentle heads-up</Text>
            <Text style={styles.infoBody}>{infoText}</Text>
            <Text style={styles.infoDisclaimer}>
              This is general info, not a diagnosis. If something feels off, a healthcare provider can tell you for sure. 🌿
            </Text>
            <TouchableOpacity style={styles.infoBtn} onPress={() => setInfoText(null)}>
              <Text style={styles.infoBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors, shadows) => StyleSheet.create({
  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadows.sm },
  label: { fontSize: 11, color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.bgElevated },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryDim },
  chipEmoji: { fontSize: 14 },
  chipLabel: { fontSize: 12, color: colors.textSecondary },
  chipLabelActive: { color: colors.primary, fontWeight: '600' },
  odorRow: { flexDirection: 'row', gap: spacing.sm },
  odorChip: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.bgElevated },
  odorLabel: { fontSize: 12, color: colors.textSecondary },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, backgroundColor: colors.overlay },
  infoModal: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', maxWidth: 340 },
  infoFlag: { fontSize: 32, marginBottom: spacing.sm },
  infoTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm },
  infoBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: spacing.md },
  infoDisclaimer: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18, fontStyle: 'italic', marginBottom: spacing.lg },
  infoBtn: { backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: spacing.sm, paddingHorizontal: spacing.xxl },
  infoBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
