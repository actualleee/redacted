import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { spacing, radius } from '../../../theme';

// Phase-specific natural remedy tips
const PHASE_TIPS = {
  menstrual: {
    endo: [
      { emoji: '🔥', tip: 'Heat therapy on lower abdomen — castor oil pack + heating pad can ease deep endo pain' },
      { emoji: '🫚', tip: 'Anti-inflammatory foods: turmeric, ginger, omega-3s. Avoid dairy and gluten if they worsen pain.' },
      { emoji: '🌿', tip: 'Magnesium glycinate (300-400mg) before sleep may reduce cramping severity' },
      { emoji: '🧘', tip: 'Restorative yoga only — child\'s pose, legs up the wall. No inversions during heavy flow.' },
    ],
    pcos: [
      { emoji: '🫖', tip: 'Spearmint tea (2 cups/day) has shown anti-androgen effects in studies' },
      { emoji: '🩸', tip: 'Track flow carefully — PCOS periods can be heavy due to thicker lining from longer cycles' },
      { emoji: '💊', tip: 'Continue any inositol supplementation consistently through your cycle' },
    ],
    general: [
      { emoji: '🛁', tip: 'Warm bath with Epsom salts for magnesium absorption through skin' },
      { emoji: '🍫', tip: 'Dark chocolate (70%+) actually helps — magnesium + endorphins' },
      { emoji: '😴', tip: 'Your body is doing a lot. Rest is not laziness right now.' },
    ],
  },
  follicular: {
    endo: [
      { emoji: '🥗', tip: 'Follicular phase is often your best window — lighter inflammation. Use it to move gently.' },
      { emoji: '🐟', tip: 'Load up on omega-3s (salmon, flax, chia) to prep for ovulation with less inflammation' },
      { emoji: '🥦', tip: 'Cruciferous vegetables support estrogen metabolism — especially important for endo' },
    ],
    pcos: [
      { emoji: '🏃', tip: 'Best exercise window for PCOS — estrogen supports insulin sensitivity. Strength training shines here.' },
      { emoji: '🥣', tip: 'Low-GI breakfast is crucial — oats, eggs, berries. Spikes now affect ovulation timing.' },
      { emoji: '🌱', tip: 'Berberine or inositol with meals helps regulate blood sugar for follicle development' },
    ],
    general: [
      { emoji: '✨', tip: 'Social and creative energy peaks here. Schedule the hard conversations and big ideas.' },
      { emoji: '💪', tip: 'Great time to start new habits — your brain retains new patterns better in follicular phase' },
    ],
  },
  ovulation: {
    endo: [
      { emoji: '⚠️', tip: 'Mid-cycle pain (Mittelschmerz) is normal — but endo can make ovulation extremely painful. Track it.' },
      { emoji: '🌿', tip: 'CBD oil (if legal for you) may help with ovulation endo flares' },
      { emoji: '🧊', tip: 'If ovulation pain is severe, note it — this pattern matters for your care team' },
    ],
    pcos: [
      { emoji: '🌡', tip: 'BBT will spike 0.2-0.5°C at ovulation — this confirms you actually ovulated (important for PCOS!)' },
      { emoji: '🫧', tip: 'Egg-white cervical mucus = ovulation window. PCOS can cause false peaks, so pair with BBT.' },
      { emoji: '🎯', tip: 'If TTC: this is the window. If not, barrier contraception is most important NOW.' },
    ],
    general: [
      { emoji: '🌕', tip: 'Highest energy and communication. Make the ask, have the talk, show up fully.' },
      { emoji: '💃', tip: 'Your body runs warm — lighter clothing, lighter food, high-intensity movement feels great' },
    ],
  },
  luteal: {
    endo: [
      { emoji: '📈', tip: 'Progesterone rise can worsen endo pain for some. Track whether your pain spikes in luteal.' },
      { emoji: '🧘', tip: 'Gentle yoga, walking, swimming — intense exercise can aggravate inflammation pre-period' },
      { emoji: '🫖', tip: 'Chamomile + ginger tea daily may reduce prostaglandins (the chemicals behind endo cramping)' },
      { emoji: '🥜', tip: 'Magnesium, B6, and zinc in late luteal can reduce the severity of your next period' },
    ],
    pcos: [
      { emoji: '🍬', tip: 'PCOS cravings are real and hormonal — keep protein and fat snacks handy to avoid blood sugar spikes' },
      { emoji: '😤', tip: 'Mood symptoms in luteal are amplified by insulin resistance. Low-GI eating is your best friend.' },
      { emoji: '💤', tip: 'Progesterone causes sleepiness — lean into it. Sleep is when your hormones reset.' },
    ],
    general: [
      { emoji: '🌾', tip: 'Complex carbs (sweet potato, brown rice, oats) genuinely reduce PMS symptoms — not just cravings.' },
      { emoji: '🧂', tip: 'Reduce sodium to ease bloating. Potassium-rich foods (banana, avocado) help too.' },
      { emoji: '📵', tip: 'Reduce alcohol in late luteal — it depletes magnesium and worsens PMS dramatically' },
    ],
  },
  unknown: { endo: [], pcos: [], general: [{ emoji: '🌱', tip: 'Log a few cycles and you\'ll start seeing personalized tips here.' }] },
};

export default function PhaseCard({ phase, phaseInfo, phaseData, accent, conditions }) {
  const { colors, shadows } = useTheme();
  const styles = makeStyles(colors, shadows);
  const [expanded, setExpanded] = useState(false);
  if (!phaseInfo) return null;
  const c = accent || colors.primary;
  const tips = PHASE_TIPS[phase] || PHASE_TIPS.unknown;
  const showTips = [
    ...(conditions?.endo ? tips.endo || [] : []),
    ...(conditions?.pcos ? tips.pcos || [] : []),
    ...tips.general,
  ].slice(0, 4);

  return (
    <TouchableOpacity
      style={[styles.card, { borderTopColor: c, borderTopWidth: 3 }]}
      onPress={() => setExpanded(e => !e)}
      activeOpacity={0.9}
    >
      <View style={styles.top}>
        <View style={styles.topLeft}>
          <Text style={styles.emoji}>{phaseInfo.emoji}</Text>
          <View>
            <Text style={[styles.phaseName, { color: c }]}>{phaseInfo.label} Phase</Text>
            {phaseData?.dayOfCycle && (
              <Text style={styles.dayText}>Day {phaseData.dayOfCycle} of your cycle</Text>
            )}
          </View>
        </View>
        <Text style={[styles.chevron, { color: c }]}>{expanded ? '▲' : '▼'}</Text>
      </View>

      <Text style={styles.feeling}>{phaseInfo.feeling}</Text>

      {expanded && (
        <View style={styles.extra}>
          {phaseInfo.needs?.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: c }]}>What your body needs</Text>
              {phaseInfo.needs.map((n, i) => (
                <Text key={i} style={styles.item}>✓  {n}</Text>
              ))}
            </View>
          )}

          {showTips.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tips for you</Text>
              {showTips.map((t, i) => (
                <View key={i} style={styles.tipRow}>
                  <Text style={styles.tipEmoji}>{t.emoji}</Text>
                  <Text style={styles.tipText}>{t.tip}</Text>
                </View>
              ))}
            </View>
          )}

          {phaseData?.inFertileWindow && (
            <View style={[styles.fertileBadge, { borderColor: c, backgroundColor: c + '15' }]}>
              <Text style={[styles.fertileText, { color: c }]}>🌿 You are in your fertile window</Text>
            </View>
          )}

          {phaseData?.nextPeriodEstimate && (
            <Text style={styles.nextPeriod}>
              Next period estimated {phaseData.nextPeriodEstimate}
            </Text>
          )}

          {phaseInfo.avoid?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Consider avoiding</Text>
              {phaseInfo.avoid.map((a, i) => (
                <Text key={i} style={styles.avoidItem}>○  {a}</Text>
              ))}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (colors, shadows) => StyleSheet.create({
  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, shadowColor: '#C4A882', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  emoji: { fontSize: 28 },
  phaseName: { fontSize: 16, fontWeight: '700' },
  dayText: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  chevron: { fontSize: 11 },
  feeling: { fontSize: 14, color: colors.textSecondary, lineHeight: 21 },
  extra: { marginTop: spacing.md },
  section: { marginBottom: spacing.md },
  sectionTitle: { fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.textMuted, marginBottom: spacing.sm, fontWeight: '600' },
  item: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  avoidItem: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  tipRow: { flexDirection: 'row', marginBottom: spacing.sm, gap: spacing.sm },
  tipEmoji: { fontSize: 16, width: 24 },
  tipText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  fertileBadge: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm, alignSelf: 'flex-start' },
  fertileText: { fontSize: 13, fontWeight: '600' },
  nextPeriod: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.sm },
});
