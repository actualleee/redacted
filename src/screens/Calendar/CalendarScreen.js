import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, isBefore, isAfter, startOfDay } from 'date-fns';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius } from '../../theme';
import { DailyLogs, Cycles } from '../../db/queries';
import { computeCycleStats, getPhaseForDate, getProjectedCycleStart, PHASE_INFO, PHASES } from '../../logic/cycleEngine';
import DayEditor from './DayEditor';

const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const PHASE_COLOR = { menstrual: '#C4806A', follicular: '#D4A55A', ovulation: '#8BAD7E', luteal: '#8E7BAA' };

const MOOD_MAP = {
  happy:'😊',calm:'🌿',content:'☕',grateful:'🌸',energetic:'✨',playful:'🌻',
  horny:'🔥',flirty:'💋',romantic:'🌹',affectionate:'🫂',
  anxious:'🌀',stressed:'😤',overwhelmed:'🌊',irritable:'😠',angry:'🔴',rage:'🌋',
  sad:'🥺',depressed:'🌧',hopeless:'🍂',lonely:'🪨',numb:'🫥',crying:'😭',sensitive:'🌷',
  brain_fog:'☁️',exhausted:'🛋',dissociated:'🌫',meh:'😑',
};

// blend hex with white (lighten) by t (0=full color, 1=white)
function lighten(hex, t) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  const nr = Math.round(r + (255-r)*t), ng = Math.round(g + (255-g)*t), nb = Math.round(b + (255-b)*t);
  return `#${nr.toString(16).padStart(2,'0')}${ng.toString(16).padStart(2,'0')}${nb.toString(16).padStart(2,'0')}`;
}

export default function CalendarScreen() {
  const { colors, shadows } = useTheme();
  const [viewDate, setViewDate] = useState(new Date());
  const [markedDays, setMarkedDays] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [cycles, setCycles] = useState([]);
  const [stats, setStats] = useState({ avgCycleLength: 28, avgPeriodLength: 5, avgLutealLength: 14 });

  const load = useCallback(async () => {
    const recent = await Cycles.getRecent(6);
    setCycles(recent);
    setStats(computeCycleStats(recent));
    const start = format(startOfMonth(viewDate), 'yyyy-MM-dd');
    const end = format(endOfMonth(viewDate), 'yyyy-MM-dd');
    const logs = await DailyLogs.getRange(start, end);
    const marks = {};
    logs.forEach(l => { marks[l.date] = { flow: l.flow, hasData: !!(l.flow || l.mood_tags || l.pain_level || l.notes) }; });
    setMarkedDays(marks);
  }, [viewDate]);

  useEffect(() => { load(); }, [load]);

  function selectDay(date) {
    setSelectedDay(date);
    setEditorOpen(true);
  }

  const days = eachDayOfInterval({ start: startOfMonth(viewDate), end: endOfMonth(viewDate) });
  const firstDow = getDay(startOfMonth(viewDate));
  const lastPeriodStart = cycles[0]?.start_date;
  const today = startOfDay(new Date());

  const FLOW_COLORS = ['transparent','#F4C4B4','#E8A896','#D4806A','#B85A48','#8A3020'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setViewDate(d => subMonths(d, 1))} style={styles.navBtn}>
          <Text style={[styles.navArrow, { color: colors.primary }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>{format(viewDate, 'MMMM yyyy')}</Text>
        <TouchableOpacity onPress={() => setViewDate(d => addMonths(d, 1))} style={styles.navBtn}>
          <Text style={[styles.navArrow, { color: colors.primary }]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dowRow}>
        {DAYS.map(d => <Text key={d} style={[styles.dowLabel, { color: colors.textMuted }]}>{d}</Text>)}
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {[...Array(firstDow)].map((_, i) => <View key={'e'+i} style={styles.dayCellEmpty} />)}
        {days.map(date => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const mark = markedDays[dateStr];
          const isToday = isSameDay(date, today);
          const isPast = isBefore(date, today);
          const isFuture = isAfter(date, today);
          const isSelected = selectedDay === dateStr;

          let phase = PHASES.UNKNOWN;
          const projStart = getProjectedCycleStart(dateStr, stats, cycles);
          if (projStart) phase = getPhaseForDate(dateStr, stats, projStart).phase;
          const baseColor = PHASE_COLOR[phase];

          // Past/today = solid; future (predicted) = lighter
          let fillColor = 'transparent';
          if (baseColor) {
            fillColor = isFuture ? lighten(baseColor, 0.55) : lighten(baseColor, 0.15);
          }

          // text color: phase day = dark text on the fill; no-phase day = readable gray
          const dayTextColor = baseColor
            ? (isFuture ? colors.textSecondary : '#3A2A1E')
            : colors.textSecondary;

          return (
            <TouchableOpacity key={dateStr} style={styles.dayCell} onPress={() => selectDay(dateStr)} activeOpacity={0.7}>
              {baseColor && <View style={[styles.phaseBg, { backgroundColor: fillColor }]} />}
              {/* logged days get an outline in the phase (or primary) color */}
              {mark?.hasData && (
                <View style={[styles.dataRing, { borderColor: baseColor || colors.primary }]} />
              )}
              {isToday && <View style={[styles.todayRing, { borderColor: colors.primary }]} />}
              {isSelected && <View style={[styles.selectedRing, { borderColor: colors.textPrimary }]} />}
              <Text style={[styles.dayText, { color: dayTextColor }, isToday && { color: colors.primary, fontWeight: '800' }]}>
                {format(date, 'd')}
              </Text>
              {mark?.flow > 0 && <View style={[styles.flowDot, { backgroundColor: FLOW_COLORS[mark.flow] }]} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.legend, { borderTopColor: colors.border }]}>
        {Object.entries(PHASE_COLOR).map(([key, c]) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: lighten(c, 0.15) }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>{PHASE_INFO[key]?.label}</Text>
          </View>
        ))}
        <Text style={[styles.legendNote, { color: colors.textMuted }]}>Lighter = predicted · ring = logged</Text>
      </View>

      <DayEditor
        date={selectedDay}
        visible={editorOpen}
        onClose={() => { setEditorOpen(false); load(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  navBtn: { padding: spacing.sm },
  navArrow: { fontSize: 28, fontWeight: '300' },
  monthTitle: { fontSize: 18, fontWeight: '700' },
  dowRow: { flexDirection: 'row', paddingHorizontal: spacing.sm, marginBottom: 4 },
  dowLabel: { width: '14.28%', textAlign: 'center', fontSize: 12, fontWeight: '500', paddingBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.sm },
  dayCellEmpty: { width: '14.28%', aspectRatio: 1 },
  dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', position: 'relative', marginVertical: 2 },
  phaseBg: { position: 'absolute', width: '82%', height: '82%', borderRadius: 999 },
  dataRing: { position: 'absolute', width: '88%', height: '88%', borderRadius: 999, borderWidth: 2 },
  todayRing: { position: 'absolute', width: '94%', height: '94%', borderRadius: 999, borderWidth: 2 },
  selectedRing: { position: 'absolute', width: '94%', height: '94%', borderRadius: 999, borderWidth: 2.5 },
  dayText: { fontSize: 14, zIndex: 1 },
  flowDot: { position: 'absolute', bottom: 3, width: 5, height: 5, borderRadius: 3, zIndex: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.md, borderTopWidth: 1, gap: spacing.sm, alignItems: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 11 },
  legendNote: { fontSize: 10, fontStyle: 'italic', width: '100%', marginTop: 4 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, minHeight: 200 },
  modalDate: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  modalItem: { fontSize: 15, marginBottom: spacing.sm, lineHeight: 22 },
  modalEmpty: { fontSize: 14, fontStyle: 'italic' },
  modalClose: { marginTop: spacing.lg, alignItems: 'center' },
  modalCloseText: { fontSize: 14 },
});
