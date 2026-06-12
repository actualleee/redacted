import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { spacing, radius } from '../../../theme';
import { DailyLogs, Cycles } from '../../../db/queries';
import Toast from '../../../components/ui/Toast';

const FLOW_OPTIONS = [
  { value: 0, label: 'None',       emoji: '○', color: '#A08070' },
  { value: 1, label: 'Spotting',   emoji: '·', color: '#E8A896' },
  { value: 2, label: 'Light',      emoji: '◔', color: '#D4806A' },
  { value: 3, label: 'Medium',     emoji: '◑', color: '#C4806A' },
  { value: 4, label: 'Heavy',      emoji: '◕', color: '#A05A48' },
  { value: 5, label: 'Very Heavy', emoji: '●', color: '#7A3828' },
];

export default function FlowCard({ flow, date, onUpdate }) {
  const { colors, shadows } = useTheme();
  const [toast, setToast] = useState(false);

  async function handleSelect(value) {
    await DailyLogs.update(date, { flow: value });
    if (value >= 2) await Cycles.startNew(date);
    setToast(false); setTimeout(() => setToast(true), 50);
    onUpdate?.();
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard, ...shadows.sm }]}>
      <Text style={[styles.label, { color: colors.textMuted }]}>FLOW</Text>
      <View style={styles.options}>
        {FLOW_OPTIONS.map(opt => (
          <TouchableOpacity key={opt.value}
            style={[styles.option, { borderColor: colors.border, backgroundColor: colors.bgElevated },
              flow === opt.value && { borderColor: opt.color, backgroundColor: opt.color + '18' }]}
            onPress={() => handleSelect(opt.value)} activeOpacity={0.7}>
            <Text style={[styles.optionEmoji, { color: opt.color }]}>{opt.emoji}</Text>
            <Text style={[styles.optionLabel, { color: colors.textMuted },
              flow === opt.value && { color: opt.color, fontWeight: '600' }]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.hint, { color: colors.textMuted }]}>Spotting won't start a new cycle</Text>
      <Toast visible={toast} message="Flow saved ✓" color="#C4806A" />
    </View>
  );
}
const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  label: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm, fontWeight: '500' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { flex: 1, minWidth: 80, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1.5 },
  optionEmoji: { fontSize: 20, marginBottom: 2 },
  optionLabel: { fontSize: 11, textAlign: 'center' },
  hint: { fontSize: 11, marginTop: spacing.sm, fontStyle: 'italic' },
});
