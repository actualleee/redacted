// src/screens/Calendar/DayEditor.js
// Full editor for ANY date — lets you log/fix past (or future) days.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, parseISO } from 'date-fns';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius } from '../../theme';
import { useAppStore } from '../../stores';
import { DailyLogs, Symptoms, SexLogs } from '../../db/queries';
import FlowCard from '../Today/components/FlowCard';
import PeriodPainCard from '../Today/components/PeriodPainCard';
import MoodCard from '../Today/components/MoodCard';
import SymptomsCard from '../Today/components/SymptomsCard';
import DischargeCard from '../Today/components/DischargeCard';
import IntimacyCard from '../Today/components/IntimacyCard';

export default function DayEditor({ date, visible, onClose }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { settings } = useAppStore();
  const conditions = { endo: !!settings?.condition_endo, pcos: !!settings?.condition_pcos, ttc: !!settings?.condition_ttc };

  const [log, setLog] = useState(null);
  const [symptoms, setSymptoms] = useState([]);
  const [sexLogs, setSexLogs] = useState([]);

  const load = useCallback(async () => {
    if (!date) return;
    setLog(await DailyLogs.getOrCreate(date));
    setSymptoms(await Symptoms.getByDate(date));
    setSexLogs(await SexLogs.getByDate(date));
  }, [date]);

  useEffect(() => { if (visible) load(); }, [visible, load]);

  if (!date) return null;
  const prettyDate = format(parseISO(date), 'EEEE, MMMM d, yyyy');
  const savedMoods = log?.mood_tags ? JSON.parse(log.mood_tags) : [];
  const showPain = (log?.flow ?? 0) > 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerLabel}>Logging</Text>
            <Text style={styles.headerDate}>{prettyDate}</Text>
          </View>
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <FlowCard flow={log?.flow ?? 0} date={date} onUpdate={load} />
          {showPain && <PeriodPainCard date={date} value={log?.pain_level ?? 0} onUpdate={load} />}
          <MoodCard date={date} onUpdate={load} savedMoods={savedMoods} />
          <SymptomsCard symptoms={symptoms} date={date} onUpdate={load} conditions={conditions} />
          <DischargeCard date={date} discharge={log?.discharge} odor={log?.odor} onUpdate={load} />
          <IntimacyCard date={date} sexLogs={sexLogs} onUpdate={load} />
          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerLabel: { fontSize: 11, color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  headerDate: { fontSize: 18, color: colors.textPrimary, fontWeight: '700', marginTop: 2 },
  doneBtn: { backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  doneText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  content: { padding: spacing.md },
});
