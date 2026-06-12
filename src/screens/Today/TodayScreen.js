import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { getTheme, phaseTheme as lightPhaseTheme } from '../../theme';
import { useTodayStore, useCycleStore, useAppStore } from '../../stores';
import { DailyLogs, Cycles, Symptoms, SexLogs, Medications } from '../../db/queries';
import { computeCycleStats, getPhaseForDate, PHASE_INFO, PHASES } from '../../logic/cycleEngine';
import PlantMascot from '../../components/plant/PlantMascot';
import FlowCard from './components/FlowCard';
import MoodCard from './components/MoodCard';
import PeriodPainCard from './components/PeriodPainCard';
import SymptomsCard from './components/SymptomsCard';
import IntimacyCard from './components/IntimacyCard';
import DischargeCard from './components/DischargeCard';
import PhaseCard from './components/PhaseCard';
import QuickLogFAB from './components/QuickLogFAB';

export default function TodayScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { settings, darkMode } = useAppStore();
  const theme = getTheme(darkMode);
  const C = theme.colors;
  const phaseTheme = theme.phaseTheme;

  const { log, symptoms, sexLogs, setLog, setSymptoms, setSexLogs, setMedications } = useTodayStore();
  const { recentCycles, todayPhase, setCycleStats, setTodayPhase, setCurrentCycle, setRecentCycles } = useCycleStore();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isPregnancy = settings?.pregnancy_mode === 1;
  const conditions = { endo: !!settings?.condition_endo, pcos: !!settings?.condition_pcos, ttc: !!settings?.condition_ttc };

  const load = useCallback(async () => {
    const todayLog = await DailyLogs.getOrCreate(todayStr);
    setLog(todayLog);
    const [syms, sex, meds] = await Promise.all([
      Symptoms.getByDate(todayStr), SexLogs.getByDate(todayStr), Medications.getByDate(todayStr),
    ]);
    setSymptoms(syms); setSexLogs(sex); setMedications(meds);
    const [current, recent] = await Promise.all([Cycles.getCurrent(), Cycles.getRecent(6)]);
    setCurrentCycle(current); setRecentCycles(recent);
    const stats = computeCycleStats(recent);
    setCycleStats(stats);
    const lastPeriodStart = recent[0]?.start_date;
    if (lastPeriodStart) setTodayPhase(getPhaseForDate(todayStr, stats, lastPeriodStart));
    else setTodayPhase({ phase: PHASES.UNKNOWN });
  }, [todayStr]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const phase = todayPhase?.phase ?? PHASES.UNKNOWN;
  const phaseInfo = PHASE_INFO[phase];
  const pTheme = phaseTheme[phase] ?? phaseTheme.unknown;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const savedMoods = log?.mood_tags ? JSON.parse(log.mood_tags) : [];
  const showPeriodPain = log?.flow > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: pTheme.bg }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={pTheme.accent} />}>

        {/* Header with plant */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: C.textMuted }]}>{greeting}</Text>
            <Text style={[styles.dateText, { color: C.textPrimary }]}>{format(new Date(), 'EEEE, MMMM d')}</Text>
            {todayPhase?.dayOfCycle && (
              <Text style={[styles.cycleDay, { color: C.textMuted }]}>
                Day {todayPhase.dayOfCycle}
                {todayPhase.daysUntilNext >= 0 ? ` · ${todayPhase.daysUntilNext}d until next period` : ''}
              </Text>
            )}
          </View>
          <View style={styles.plantWrap}>
            <PlantMascot phase={phase} size={0.85} />
          </View>
        </View>

        {/* Phase pill */}
        <TouchableOpacity style={[styles.phasePill, { backgroundColor: pTheme.soft, borderColor: pTheme.accent + '80' }]}
          activeOpacity={0.9}>
          <Text style={{ fontSize: 16 }}>{phaseInfo?.emoji}</Text>
          <Text style={[styles.phaseLabel, { color: pTheme.accent }]}>{phaseInfo?.label} Phase</Text>
        </TouchableOpacity>

        <PhaseCard phase={phase} phaseInfo={phaseInfo} phaseData={todayPhase}
          accent={pTheme.accent} conditions={conditions} />

        {!isPregnancy && <FlowCard flow={log?.flow ?? 0} date={todayStr} onUpdate={load} />}

        {showPeriodPain && (
          <PeriodPainCard date={todayStr} value={log?.pain_level ?? 0} onUpdate={load} />
        )}

        <MoodCard date={todayStr} onUpdate={load} savedMoods={savedMoods} />

        <SymptomsCard symptoms={symptoms} date={todayStr} onUpdate={load} conditions={conditions} />

        <DischargeCard date={todayStr} discharge={log?.discharge} odor={log?.odor} onUpdate={load} />

        <IntimacyCard date={todayStr} sexLogs={sexLogs} onUpdate={load} />

        <View style={{ height: 100 }} />
      </ScrollView>
      <QuickLogFAB date={todayStr} onLogged={load} accent={pTheme.accent} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  greeting: { fontSize: 13, marginBottom: 2 },
  dateText: { fontSize: 22, fontWeight: '700' },
  cycleDay: { fontSize: 12, marginTop: 3 },
  plantWrap: { marginTop: -8 },
  phasePill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, alignSelf: 'flex-start', marginBottom: 12 },
  phaseLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
});
