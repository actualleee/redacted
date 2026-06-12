import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { spacing, radius } from '../../../theme';
import { DailyLogs } from '../../../db/queries';
import Toast from '../../../components/ui/Toast';

const LABELS = ['','Barely','','Noticeable','','Moderate','','Strong','','Severe','Unbearable'];

export default function PeriodPainCard({ date, value, onUpdate }) {
  const { colors, shadows } = useTheme();
  const [toast, setToast] = useState(false);

  async function select(v) {
    await DailyLogs.update(date, { pain_level: v });
    setToast(false); setTimeout(() => setToast(true), 50);
    onUpdate?.();
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard, ...shadows.sm }]}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textMuted }]}>PERIOD PAIN</Text>
        {value > 0 && <Text style={[styles.current, { color: value >= 7 ? colors.error : value >= 4 ? colors.warning : colors.success }]}>
          {value}/10 — {LABELS[value]}
        </Text>}
      </View>
      <View style={styles.scale}>
        {[...Array(10)].map((_, i) => {
          const v = i + 1;
          const active = value === v;
          const c = v >= 8 ? colors.error : v >= 5 ? colors.warning : colors.primary;
          return (
            <TouchableOpacity key={v}
              style={[styles.dot, { borderColor: colors.border, backgroundColor: colors.bgElevated },
                active && { backgroundColor: c, borderColor: c }]}
              onPress={() => select(v)}>
              <Text style={[styles.dotText, { color: colors.textMuted }, active && { color: '#fff', fontWeight: '700' }]}>{v}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Toast visible={toast} message={`Pain ${value}/10 logged ✓`} color={colors.accent} />
    </View>
  );
}
const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  label: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '500' },
  current: { fontSize: 13, fontWeight: '600' },
  scale: { flexDirection: 'row', gap: 5 },
  dot: { flex: 1, aspectRatio: 1, borderRadius: radius.sm, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dotText: { fontSize: 12 },
});
