import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { spacing, radius } from '../../../theme';
import { Symptoms } from '../../../db/queries';
import Toast from '../../../components/ui/Toast';

const SYMPTOM_GROUPS = {
  general: [
    { key: 'cramps', label: 'Cramps', emoji: '🌀' }, { key: 'bloating', label: 'Bloating', emoji: '🫧' },
    { key: 'headache', label: 'Headache', emoji: '🤕' }, { key: 'fatigue', label: 'Fatigue', emoji: '🍂' },
    { key: 'nausea', label: 'Nausea', emoji: '🌊' }, { key: 'acne', label: 'Acne', emoji: '🌺' },
    { key: 'breast_tenderness', label: 'Breast Tender', emoji: '💜' }, { key: 'mood_swings', label: 'Mood Swings', emoji: '🌤' },
    { key: 'insomnia', label: 'Insomnia', emoji: '🌙' }, { key: 'anxiety', label: 'Anxiety', emoji: '🍃' },
    { key: 'brain_fog', label: 'Brain Fog', emoji: '☁️' }, { key: 'cravings', label: 'Cravings', emoji: '🍫' },
  ],
  endo: [
    { key: 'endo_pelvic_pain', label: 'Pelvic Pain', emoji: '🔴' }, { key: 'endo_bowel_pain', label: 'Bowel Pain', emoji: '🟠' },
    { key: 'endo_bladder_pain', label: 'Bladder Pain', emoji: '🟡' }, { key: 'endo_back_pain', label: 'Back/Hip Pain', emoji: '⬆️' },
    { key: 'endo_leg_pain', label: 'Leg Pain', emoji: '🦵' }, { key: 'endo_sex_pain', label: 'Pain with Sex', emoji: '💙' },
    { key: 'endo_spotting', label: 'Mid-cycle Spotting', emoji: '🩸' }, { key: 'endo_inflammation', label: 'Inflammation', emoji: '🔥' },
    { key: 'endo_rectal_cramp', label: 'Butt / Rectal Cramp', emoji: '🍑' },
  ],
  pcos: [
    { key: 'pcos_hirsutism_face', label: 'Face Hair', emoji: '👤' }, { key: 'pcos_hair_loss', label: 'Hair Loss', emoji: '🍂' },
    { key: 'pcos_acne_chin', label: 'Hormonal Acne', emoji: '🌺' }, { key: 'pcos_blood_sugar', label: 'Energy Crash', emoji: '📉' },
    { key: 'pcos_weight_gain', label: 'Weight Change', emoji: '⚖️' }, { key: 'pcos_ovary_pain', label: 'Ovary Pain', emoji: '🟣' },
  ],
};

export default function SymptomsCard({ symptoms, date, onUpdate, conditions }) {
  const { colors, shadows } = useTheme();
  const [severityModal, setSeverityModal] = useState(null);
  const [activeGroup, setActiveGroup] = useState('general');
  const [toast, setToast] = useState(false);
  const logged = symptoms.map(s => s.symptom);

  const groups = [
    { key: 'general', label: 'General' },
    ...(conditions?.endo ? [{ key: 'endo', label: 'Endo' }] : []),
    ...(conditions?.pcos ? [{ key: 'pcos', label: 'PCOS' }] : []),
  ];

  async function addSymptom(key, severity) {
    await Symptoms.add(date, key, severity);
    setSeverityModal(null);
    setToast(false); setTimeout(() => setToast(true), 50);
    onUpdate?.();
  }

  async function removeSymptom(id) { await Symptoms.remove(id); onUpdate?.(); }

  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard, ...shadows.sm }]}>
      <Text style={[styles.label, { color: colors.textMuted }]}>SYMPTOMS</Text>
      {groups.length > 1 && (
        <View style={styles.groupTabs}>
          {groups.map(g => (
            <TouchableOpacity key={g.key}
              style={[styles.groupTab, { backgroundColor: colors.bgElevated, borderColor: colors.border },
                activeGroup === g.key && { backgroundColor: colors.primaryDim, borderColor: colors.primary }]}
              onPress={() => setActiveGroup(g.key)}>
              <Text style={[styles.groupTabText, { color: colors.textMuted },
                activeGroup === g.key && { color: colors.primary, fontWeight: '600' }]}>{g.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={styles.grid}>
        {(SYMPTOM_GROUPS[activeGroup] || []).map(s => {
          const active = logged.includes(s.key);
          const loggedEntry = symptoms.find(x => x.symptom === s.key);
          return (
            <TouchableOpacity key={s.key}
              style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.bgElevated },
                active && { borderColor: colors.primary, backgroundColor: colors.primaryDim }]}
              onPress={() => active ? removeSymptom(loggedEntry.id) : setSeverityModal(s)} activeOpacity={0.7}>
              <Text style={styles.chipEmoji}>{s.emoji}</Text>
              <Text style={[styles.chipLabel, { color: colors.textSecondary },
                active && { color: colors.primary, fontWeight: '600' }]}>{s.label}</Text>
              {active && loggedEntry && <Text style={[styles.sev, { color: colors.primary }]}>{loggedEntry.severity}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
      {symptoms.length > 0 && <Text style={[styles.logged, { color: colors.textMuted }]}>{symptoms.length} symptom{symptoms.length !== 1 ? 's' : ''} logged today</Text>}
      <Toast visible={toast} message="Symptom logged ✓" color={colors.primary} />
      <Modal visible={!!severityModal} transparent animationType="fade">
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modal, { backgroundColor: colors.bgCard }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{severityModal?.emoji} {severityModal?.label}</Text>
            <Text style={[styles.modalSub, { color: colors.textMuted }]}>How severe is it right now?</Text>
            <View style={styles.severityRow}>
              {[[1,'Mild'],[2,''],[3,'Moderate'],[4,''],[5,'Severe']].map(([n, lbl]) => (
                <TouchableOpacity key={n} style={[styles.sevBtn, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
                  onPress={() => addSymptom(severityModal.key, n)}>
                  <Text style={[styles.sevBtnText, { color: colors.textPrimary }]}>{n}</Text>
                  {lbl ? <Text style={[styles.sevBtnLabel, { color: colors.textMuted }]}>{lbl}</Text> : null}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => setSeverityModal(null)} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  label: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm, fontWeight: '500' },
  groupTabs: { flexDirection: 'row', marginBottom: spacing.sm, gap: spacing.sm },
  groupTab: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1 },
  groupTabText: { fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5 },
  chipEmoji: { fontSize: 14 },
  chipLabel: { fontSize: 12 },
  sev: { fontSize: 10, fontWeight: '700', marginLeft: 2 },
  logged: { marginTop: spacing.sm, fontSize: 12, fontStyle: 'italic' },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl },
  modalTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  modalSub: { fontSize: 14, textAlign: 'center', marginBottom: spacing.lg },
  severityRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  sevBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.md, marginHorizontal: 3, borderWidth: 1 },
  sevBtnText: { fontSize: 20, fontWeight: '700' },
  sevBtnLabel: { fontSize: 9, marginTop: 2 },
  cancelBtn: { alignItems: 'center', padding: spacing.md },
  cancelText: { fontSize: 14 },
});
