import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { spacing, radius } from '../../../theme';
import { SexLogs } from '../../../db/queries';
import Toast from '../../../components/ui/Toast';

const OPTIONS = [
  { key: 'none', emoji: '○', label: 'None' },
  { key: 'solo', emoji: '🌙', label: 'Solo' },
  { key: 'oral', emoji: '👅', label: 'Oral' },
  { key: 'protected', emoji: '🛡', label: 'Protected' },
  { key: 'unprotected', emoji: '🌿', label: 'Unprotected' },
];

export default function IntimacyCard({ date, sexLogs = [], onUpdate }) {
  const { colors, shadows } = useTheme();
  const [toast, setToast] = useState(false);
  const [pain, setPain] = useState(false);

  const logged = sexLogs[0];
  const currentType = logged?.contraceptive === 'solo' ? 'solo'
    : logged?.contraceptive === 'oral' ? 'oral'
    : logged?.protected === 0 ? 'unprotected'
    : logged ? 'protected' : 'none';

  async function select(key) {
    if (key === 'none') { if (logged) await SexLogs.remove(logged.id); }
    else await SexLogs.add(date, {
      protected: key === 'protected' ? 1 : 0,
      contraceptive: key === 'solo' ? 'solo' : key === 'oral' ? 'oral' : key === 'unprotected' ? 'none' : 'condom',
      notes: pain ? 'pain noted' : null,
    });
    setToast(false); setTimeout(() => setToast(true), 50);
    onUpdate?.();
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard, ...shadows.sm }]}>
      <Text style={[styles.label, { color: colors.textMuted }]}>SEX & INTIMACY</Text>
      <View style={styles.options}>
        {OPTIONS.map(opt => {
          const active = currentType === opt.key;
          return (
            <TouchableOpacity key={opt.key}
              style={[styles.option, { borderColor: colors.border, backgroundColor: colors.bgElevated },
                active && { borderColor: colors.primary, backgroundColor: colors.primaryDim }]}
              onPress={() => select(opt.key)} activeOpacity={0.7}>
              <Text style={styles.optionEmoji}>{opt.emoji}</Text>
              <Text style={[styles.optionLabel, { color: colors.textMuted },
                active && { color: colors.primary, fontWeight: '600' }]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {currentType !== 'none' && (
        <TouchableOpacity style={[styles.painRow, { backgroundColor: colors.bgElevated, borderColor: colors.border },
          pain && { borderColor: colors.error, backgroundColor: colors.error + '10' }]}
          onPress={() => setPain(!pain)} activeOpacity={0.8}>
          <Text style={[styles.painText, { color: colors.textSecondary }, pain && { color: colors.error }]}>
            {pain ? '● ' : '○ '}Pain during or after
          </Text>
        </TouchableOpacity>
      )}
      <Toast visible={toast} message="Logged ✓" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  label: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm, fontWeight: '500' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { flex: 1, minWidth: 60, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1.5 },
  optionEmoji: { fontSize: 18, marginBottom: 3 },
  optionLabel: { fontSize: 11, textAlign: 'center' },
  painRow: { marginTop: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1 },
  painText: { fontSize: 14, fontWeight: '500' },
});
