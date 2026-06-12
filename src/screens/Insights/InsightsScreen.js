import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius } from '../../theme';
import { Cycles, Symptoms, InsightsCache, dbAll } from '../../db/queries';
import { computeCycleStats, detectAnomalies } from '../../logic/cycleEngine';
import { differenceInDays, parseISO, format } from 'date-fns';

const MOOD_MAP = {
  happy:'😊 Happy',calm:'🌿 Calm',content:'☕ Content',grateful:'🌸 Grateful',energetic:'✨ Energetic',playful:'🌻 Playful',
  horny:'🔥 Horny',flirty:'💋 Flirty',romantic:'🌹 Romantic',affectionate:'🫂 Affectionate',
  anxious:'🌀 Anxious',stressed:'😤 Stressed',overwhelmed:'🌊 Overwhelmed',irritable:'😠 Irritable',angry:'🔴 Angry',rage:'🌋 Rage',
  sad:'🥺 Sad',depressed:'🌧 Depressed',hopeless:'🍂 Hopeless',lonely:'🪨 Lonely',numb:'🫥 Numb',crying:'😭 Crying',sensitive:'🌷 Sensitive',
  brain_fog:'☁️ Brain Fog',exhausted:'🛋 Exhausted',dissociated:'🌫 Dissociated',meh:'😑 Meh',
};

const PHASE_EDU = [
  { name: 'Menstrual', emoji: '🌑', color: '#C4806A', days: 'Days 1–5 (roughly)',
    body: 'Your period. Hormones are at their lowest, energy often dips. Rest is productive right now — your body is doing real work. Iron-rich food and warmth help.' },
  { name: 'Follicular', emoji: '🌱', color: '#D4A55A', days: 'Days 6–13 (roughly)',
    body: 'Estrogen rises, energy climbs. Often the best window for new projects, workouts, and social plans. Your body is prepping an egg for release.' },
  { name: 'Ovulation', emoji: '🌕', color: '#8BAD7E', days: 'Around day 14',
    body: 'An egg releases. Energy, libido, and confidence often peak. This is your fertile window — important whether you\'re trying to conceive or avoiding it.' },
  { name: 'Luteal', emoji: '🌗', color: '#8E7BAA', days: 'Days 15–28 (roughly)',
    body: 'Progesterone rises, then drops if no pregnancy. PMS can show up late here — cravings, mood shifts, bloating. Complex carbs, magnesium, and gentler movement help.' },
];

export default function InsightsScreen() {
  const { colors, shadows } = useTheme();
  const [cycles, setCycles] = useState([]);
  const [stats, setStats] = useState(null);
  const [topSymptoms, setTopSymptoms] = useState([]);
  const [topMoods, setTopMoods] = useState([]);
  const [anomalies, setAnomalies] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const recent = await Cycles.getRecent(6);
    setCycles(recent);
    const s = computeCycleStats(recent);
    setStats(s);
    setTopSymptoms(await Symptoms.getFrequency());
    setAnomalies(detectAnomalies(recent, s));

    // Aggregate mood_tags from last 90 days
    const threeMonthsAgo = format(new Date(Date.now() - 90*24*60*60*1000), 'yyyy-MM-dd');
    const moodLogs = await dbAll(
      `SELECT mood_tags FROM daily_logs WHERE date >= ? AND mood_tags IS NOT NULL AND mood_tags != '[]'`,
      [threeMonthsAgo]
    );
    const moodCount = {};
    moodLogs.forEach(row => {
      try {
        JSON.parse(row.mood_tags).forEach(key => { moodCount[key] = (moodCount[key] || 0) + 1; });
      } catch {}
    });
    const sorted = Object.entries(moodCount).sort((a,b) => b[1]-a[1]).slice(0,8);
    setTopMoods(sorted);
  }

  const real = cycles.filter(c => !c.is_predicted && c.end_date);
  const cycleLengthData = real.map((c, i) => {
    const next = real[i - 1];
    if (!next) return null;
    const len = differenceInDays(parseISO(next.start_date), parseISO(c.start_date));
    return { label: format(parseISO(c.start_date), 'MMM'), value: len };
  }).filter(Boolean).reverse();
  const maxLen = cycleLengthData.length ? Math.max(...cycleLengthData.map(d => d.value), 35) : 35;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Insights</Text>

        {(!stats || stats.confidence === 0) && (
          <>
            <View style={[styles.emptyCard, { backgroundColor: colors.bgCard, ...shadows.sm }]}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Your insights are growing</Text>
              <Text style={[styles.emptyBody, { color: colors.textMuted }]}>After 2–3 logged cycles, you'll see your personal patterns here. Until then, here's a little about what your body is up to.</Text>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Know Your Cycle</Text>
            {PHASE_EDU.map(p => (
              <View key={p.name} style={[styles.eduCard, { backgroundColor: colors.bgCard, borderLeftColor: p.color, ...shadows.sm }]}>
                <Text style={[styles.eduName, { color: p.color }]}>{p.emoji}  {p.name}</Text>
                <Text style={[styles.eduDays, { color: colors.textMuted }]}>{p.days}</Text>
                <Text style={[styles.eduBody, { color: colors.textSecondary }]}>{p.body}</Text>
              </View>
            ))}

            <View style={[styles.eduCard, { backgroundColor: colors.bgCard, borderLeftColor: colors.primary, ...shadows.sm }]}>
              <Text style={[styles.eduName, { color: colors.primary }]}>💡  Good to know</Text>
              <Text style={[styles.eduBody, { color: colors.textSecondary }]}>A "normal" cycle is anywhere from 21 to 35 days — there's a huge healthy range. Cycles also shift with stress, sleep, travel, and age. Tracking yours helps you learn your own normal, which is the only one that matters.</Text>
            </View>
          </>
        )}

        {stats && stats.confidence > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Cycle Overview</Text>
            <View style={styles.statRow}>
              {[
                { label: 'Avg Cycle', value: `${stats.avgCycleLength}d`, color: colors.primary },
                { label: 'Avg Period', value: `${stats.avgPeriodLength}d`, color: '#C4806A' },
                { label: 'Luteal', value: `${stats.avgLutealLength}d`, color: '#8E7BAA' },
              ].map(s => (
                <View key={s.label} style={[styles.statCard, { backgroundColor: colors.bgCard, borderTopColor: s.color, borderTopWidth: 2, ...shadows.sm }]}>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.confidenceCard, { backgroundColor: colors.bgCard, ...shadows.sm }]}>
              <Text style={[styles.confLabel, { color: colors.textSecondary }]}>Prediction confidence</Text>
              <View style={[styles.confBar, { backgroundColor: colors.border }]}>
                <View style={[styles.confFill, { width: `${stats.confidence * 100}%`, backgroundColor: colors.primary }]} />
              </View>
              <Text style={[styles.confSub, { color: colors.textMuted }]}>Based on {real.length} logged cycle{real.length !== 1 ? 's' : ''}</Text>
            </View>

            {cycleLengthData.length >= 2 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Cycle Length History</Text>
                <View style={[styles.chartCard, { backgroundColor: colors.bgCard, ...shadows.sm }]}>
                  <View style={styles.barChart}>
                    {cycleLengthData.map((d, i) => (
                      <View key={i} style={styles.barCol}>
                        <View style={styles.barWrapper}>
                          <View style={[styles.bar, { height: `${Math.round((d.value/maxLen)*100)}%`, backgroundColor: colors.primary }]} />
                        </View>
                        <Text style={[styles.barLabel, { color: colors.textMuted }]}>{d.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}
          </>
        )}

        {topMoods.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Top Moods (last 90 days)</Text>
            <View style={[styles.moodCard, { backgroundColor: colors.bgCard, ...shadows.sm }]}>
              {topMoods.map(([key, count]) => (
                <View key={key} style={styles.moodRow}>
                  <Text style={[styles.moodName, { color: colors.textSecondary }]}>{MOOD_MAP[key] || key}</Text>
                  <View style={[styles.moodBar, { backgroundColor: colors.border }]}>
                    <View style={[styles.moodFill, { width: `${Math.min(100, count * 8)}%`, backgroundColor: colors.primary + 'AA' }]} />
                  </View>
                  <Text style={[styles.moodCount, { color: colors.textMuted }]}>{count}×</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {topSymptoms.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Top Symptoms (last 90 days)</Text>
            <View style={[styles.moodCard, { backgroundColor: colors.bgCard, ...shadows.sm }]}>
              {topSymptoms.slice(0,6).map((s,i) => (
                <View key={i} style={styles.moodRow}>
                  <Text style={[styles.moodName, { color: colors.textSecondary }]}>{s.symptom.replace(/_/g,' ')}</Text>
                  <View style={[styles.moodBar, { backgroundColor: colors.border }]}>
                    <View style={[styles.moodFill, { width: `${Math.min(100,s.count*10)}%`, backgroundColor: '#C4806A88' }]} />
                  </View>
                  <Text style={[styles.moodCount, { color: colors.textMuted }]}>{s.count}×</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {anomalies.map((a, i) => (
          <View key={i} style={[styles.anomalyCard, { backgroundColor: colors.bgCard, borderLeftColor: colors.warning, ...shadows.sm }]}>
            <Text style={styles.anomalyEmoji}>⚡</Text>
            <Text style={[styles.anomalyText, { color: colors.textSecondary }]}>{a.message}</Text>
          </View>
        ))}

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md },
  title: { fontSize: 28, fontWeight: '700', marginBottom: spacing.lg },
  sectionTitle: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm, marginTop: spacing.md, fontWeight: '600' },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2, textAlign: 'center' },
  confidenceCard: { borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  confLabel: { fontSize: 13, marginBottom: spacing.sm },
  confBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  confFill: { height: '100%', borderRadius: 3 },
  confSub: { fontSize: 11, marginTop: spacing.xs },
  chartCard: { borderRadius: radius.md, padding: spacing.md, height: 160 },
  barChart: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barWrapper: { flex: 1, width: '70%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 3, minHeight: 4 },
  barLabel: { fontSize: 10, marginTop: 4 },
  moodCard: { borderRadius: radius.md, padding: spacing.md },
  moodRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  moodName: { width: 140, fontSize: 13 },
  moodBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden', marginHorizontal: spacing.sm },
  moodFill: { height: '100%', borderRadius: 3 },
  moodCount: { fontSize: 12, width: 28, textAlign: 'right' },
  anomalyCard: { borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, borderLeftWidth: 2 },
  anomalyEmoji: { fontSize: 16 },
  anomalyText: { flex: 1, fontSize: 14, lineHeight: 20 },
  emptyCard: { borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', marginTop: spacing.lg },
  emptyEmoji: { fontSize: 40, marginBottom: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: spacing.sm },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
  eduCard: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderLeftWidth: 3 },
  eduName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  eduDays: { fontSize: 11, marginBottom: spacing.sm },
  eduBody: { fontSize: 13, lineHeight: 20 },
});
