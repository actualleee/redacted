import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { spacing, radius } from '../../../theme';
import { DailyLogs } from '../../../db/queries';
import Toast from '../../../components/ui/Toast';

const MOOD_GROUPS = [
  { label: 'Feeling Good', color: '#6B8C5F', moods: [
    { key: 'happy', emoji: '😊', label: 'Happy' }, { key: 'calm', emoji: '🌿', label: 'Calm' },
    { key: 'content', emoji: '☕', label: 'Content' }, { key: 'grateful', emoji: '🌸', label: 'Grateful' },
    { key: 'energetic', emoji: '✨', label: 'Energetic' }, { key: 'playful', emoji: '🌻', label: 'Playful' },
  ]},
  { label: 'Romantic', color: '#C4806A', moods: [
    { key: 'horny', emoji: '🔥', label: 'Horny' }, { key: 'flirty', emoji: '💋', label: 'Flirty' },
    { key: 'romantic', emoji: '🌹', label: 'Romantic' }, { key: 'affectionate', emoji: '🫂', label: 'Affectionate' },
  ]},
  { label: 'Struggling', color: '#8E7BAA', moods: [
    { key: 'anxious', emoji: '🌀', label: 'Anxious' }, { key: 'stressed', emoji: '😤', label: 'Stressed' },
    { key: 'overwhelmed', emoji: '🌊', label: 'Overwhelmed' }, { key: 'irritable', emoji: '😠', label: 'Irritable' },
    { key: 'angry', emoji: '🔴', label: 'Angry' }, { key: 'rage', emoji: '🌋', label: 'Rage' },
  ]},
  { label: 'Low', color: '#7B9EAA', moods: [
    { key: 'sad', emoji: '🥺', label: 'Sad' }, { key: 'depressed', emoji: '🌧', label: 'Depressed' },
    { key: 'hopeless', emoji: '🍂', label: 'Hopeless' }, { key: 'lonely', emoji: '🪨', label: 'Lonely' },
    { key: 'numb', emoji: '🫥', label: 'Numb' }, { key: 'crying', emoji: '😭', label: 'Crying' },
    { key: 'sensitive', emoji: '🌷', label: 'Sensitive' },
  ]},
  { label: 'Foggy', color: '#A08070', moods: [
    { key: 'brain_fog', emoji: '☁️', label: 'Brain Fog' }, { key: 'exhausted', emoji: '🛋', label: 'Exhausted' },
    { key: 'dissociated', emoji: '🌫', label: 'Dissociated' }, { key: 'meh', emoji: '😑', label: 'Meh' },
  ]},
];

export default function MoodCard({ date, onUpdate, savedMoods = [] }) {
  const { colors, shadows } = useTheme();
  const [selected, setSelected] = useState(savedMoods);
  const [toast, setToast] = useState(false);

  // keep in sync when the day's saved moods load/change
  useEffect(() => { setSelected(savedMoods); }, [savedMoods.join(',')]);

  async function toggle(key) {
    const next = selected.includes(key) ? selected.filter(k => k !== key) : [...selected, key];
    setSelected(next);
    await DailyLogs.update(date, { mood_tags: JSON.stringify(next) });
    setToast(false); setTimeout(() => setToast(true), 50);
    onUpdate?.();
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard, ...shadows.sm }]}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textMuted }]}>MOOD</Text>
        {selected.length > 0 && <Text style={[styles.count, { color: colors.primary }]}>{selected.length} selected</Text>}
      </View>
      {MOOD_GROUPS.map(group => (
        <View key={group.label} style={styles.group}>
          <Text style={[styles.groupLabel, { color: group.color }]}>{group.label}</Text>
          <View style={styles.chips}>
            {group.moods.map(mood => {
              const active = selected.includes(mood.key);
              return (
                <TouchableOpacity key={mood.key}
                  style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.bgElevated },
                    active && { borderColor: group.color, backgroundColor: group.color + '18' }]}
                  onPress={() => toggle(mood.key)} activeOpacity={0.7}>
                  <Text style={styles.chipEmoji}>{mood.emoji}</Text>
                  <Text style={[styles.chipLabel, { color: colors.textSecondary },
                    active && { color: group.color, fontWeight: '600' }]}>{mood.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
      <Toast visible={toast} message="Mood saved ✓" color={colors.primary} />
    </View>
  );
}
const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  label: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '500' },
  count: { fontSize: 12, fontWeight: '600' },
  group: { marginBottom: spacing.md },
  groupLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1.5 },
  chipEmoji: { fontSize: 14 },
  chipLabel: { fontSize: 12 },
});
