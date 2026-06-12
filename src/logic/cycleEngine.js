// src/logic/cycleEngine.js
// All cycle math. No UI, no DB calls — pure logic.
// Feed it data, get predictions back.

import { addDays, differenceInDays, parseISO, format, isWithinInterval, isAfter } from 'date-fns';

// ─── Phase Definitions ────────────────────────────────────────────────────────

export const PHASES = {
  MENSTRUAL:   'menstrual',
  FOLLICULAR:  'follicular',
  OVULATION:   'ovulation',
  LUTEAL:      'luteal',
  UNKNOWN:     'unknown',
};

export const PHASE_INFO = {
  menstrual: {
    label: 'Menstrual',
    emoji: '🌑',
    color: '#C84B6E',
    days: '1–5',
    feeling: "Your body is releasing the uterine lining. Energy is low — that's by design.",
    needs: ['Rest', 'Iron-rich foods', 'Heat for cramps', 'Gentle movement only'],
    avoid: ['Intense exercise', 'Caffeine on empty stomach', 'Pushing through fatigue'],
  },
  follicular: {
    label: 'Follicular',
    emoji: '🌒',
    color: '#E8855A',
    days: '6–13',
    feeling: "Estrogen is rising. You may feel sharper, more social, and more energetic.",
    needs: ['New projects', 'Social connection', 'Strength training', 'Fermented foods'],
    avoid: ['Isolation', 'Skipping sleep'],
  },
  ovulation: {
    label: 'Ovulation',
    emoji: '🌕',
    color: '#F5C842',
    days: '14',
    feeling: "Peak estrogen + LH surge. You may feel magnetic, confident, and warm.",
    needs: ['Connection', 'Big conversations', 'High-intensity workouts', 'Raw veggies'],
    avoid: ['Processed foods', 'Stress if TTC'],
  },
  luteal: {
    label: 'Luteal',
    emoji: '🌖',
    color: '#8E6BBF',
    days: '15–28',
    feeling: "Progesterone rises then falls. PMS window. Your body is preparing for either pregnancy or your period.",
    needs: ['Magnesium', 'B6', 'Boundaries', 'Slower pace', 'Complex carbs'],
    avoid: ['Alcohol', 'Salt', 'Caffeine in late luteal', 'Overcommitting'],
  },
  unknown: {
    label: 'Tracking...',
    emoji: '🌑',
    color: '#666',
    days: '?',
    feeling: "Log a few cycles and Redacted will start predicting your phases.",
    needs: [],
    avoid: [],
  },
};

// ─── Cycle Stats from Historical Data ─────────────────────────────────────────

/**
 * @param {Array} cycles - from DB, sorted DESC by start_date
 * @returns {{ avgCycleLength, avgPeriodLength, avgLutealLength, confidence }}
 */
export function computeCycleStats(cycles) {
  const real = cycles.filter(c => !c.is_predicted && c.end_date);

  if (real.length < 2) {
    return {
      avgCycleLength: 28,
      avgPeriodLength: 5,
      avgLutealLength: 14,
      confidence: 0,
    };
  }

  // Cycle lengths: distance from start to next start
  const cycleLengths = [];
  for (let i = 0; i < real.length - 1; i++) {
    const len = differenceInDays(
      parseISO(real[i].start_date),
      parseISO(real[i + 1].start_date)
    );
    if (len > 15 && len < 60) cycleLengths.push(len); // sanity filter
  }

  const periodLengths = real
    .filter(c => c.period_length && c.period_length > 0 && c.period_length < 15)
    .map(c => c.period_length);

  const avg = arr =>
    arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

  const avgCycleLength = avg(cycleLengths) ?? 28;
  const avgPeriodLength = avg(periodLengths) ?? 5;
  // Luteal phase is typically consistent at ~14 days regardless of cycle length
  // Follicular phase = cycle length - luteal length
  const avgLutealLength = 14;

  // Confidence: 0 = no data, 1 = solid (6+ cycles)
  const confidence = Math.min(1, real.length / 6);

  return { avgCycleLength, avgPeriodLength, avgLutealLength, confidence };
}

// ─── Phase for a Given Date ───────────────────────────────────────────────────

/**
 * @param {string} date - 'yyyy-MM-dd'
 * @param {object} stats - from computeCycleStats
 * @param {string} lastPeriodStart - 'yyyy-MM-dd'
 * @returns {{ phase, dayOfCycle, daysUntilNext, fertileWindow }}
 */
export function getPhaseForDate(date, stats, lastPeriodStart) {
  if (!lastPeriodStart) return { phase: PHASES.UNKNOWN, dayOfCycle: null };

  const dayOfCycle =
    differenceInDays(parseISO(date), parseISO(lastPeriodStart)) + 1;

  const { avgCycleLength, avgPeriodLength, avgLutealLength } = stats;
  const ovulationDay = avgCycleLength - avgLutealLength;

  let phase;
  if (dayOfCycle >= 1 && dayOfCycle <= avgPeriodLength) {
    phase = PHASES.MENSTRUAL;
  } else if (dayOfCycle <= ovulationDay - 1) {
    phase = PHASES.FOLLICULAR;
  } else if (dayOfCycle === ovulationDay || dayOfCycle === ovulationDay + 1) {
    phase = PHASES.OVULATION;
  } else if (dayOfCycle <= avgCycleLength) {
    phase = PHASES.LUTEAL;
  } else {
    // Past expected cycle end — period may be late
    phase = PHASES.LUTEAL;
  }

  const nextPeriodDate = addDays(parseISO(lastPeriodStart), avgCycleLength);
  const daysUntilNext = differenceInDays(nextPeriodDate, parseISO(date));

  // Fertile window: 5 days before ovulation + ovulation day
  const fertileStart = addDays(parseISO(lastPeriodStart), ovulationDay - 6);
  const fertileEnd = addDays(parseISO(lastPeriodStart), ovulationDay);
  const inFertileWindow = isWithinInterval(parseISO(date), {
    start: fertileStart,
    end: fertileEnd,
  });

  return {
    phase,
    dayOfCycle,
    daysUntilNext,
    inFertileWindow,
    ovulationEstimate: format(
      addDays(parseISO(lastPeriodStart), ovulationDay - 1),
      'yyyy-MM-dd'
    ),
    nextPeriodEstimate: format(nextPeriodDate, 'yyyy-MM-dd'),
    fertileWindowStart: format(fertileStart, 'yyyy-MM-dd'),
    fertileWindowEnd: format(fertileEnd, 'yyyy-MM-dd'),
  };
}

// ─── Projected Cycle Anchor (tiles phases into past & future) ─────────────────

/**
 * Given any date, find the cycle-start it belongs to by anchoring to the most
 * recent REAL logged period start at/ before that date, then projecting forward
 * (or backward) by whole cycle lengths. This is what lets the calendar show
 * predicted phases months ahead instead of smearing luteal across everything.
 *
 * @param {string} date - 'yyyy-MM-dd'
 * @param {object} stats - from computeCycleStats
 * @param {Array} cycles - cycles from DB (real + predicted ok; predicted ignored)
 * @returns {string|null} projected cycle start 'yyyy-MM-dd', or null if no data
 */
export function getProjectedCycleStart(date, stats, cycles) {
  const L = stats?.avgCycleLength || 28;
  const realStarts = (cycles || [])
    .filter(c => !c.is_predicted && c.start_date)
    .map(c => c.start_date)
    .sort(); // ascending
  if (realStarts.length === 0) return null;

  const d = parseISO(date);

  // most recent real start at or before this date
  let anchor = null;
  for (const s of realStarts) {
    if (!isAfter(parseISO(s), d)) anchor = s;
    else break;
  }

  const base = anchor || realStarts[0]; // before all data → project back from earliest
  const diff = differenceInDays(d, parseISO(base));
  const k = Math.floor(diff / L); // whole cycles away (negative = before)
  return format(addDays(parseISO(base), k * L), 'yyyy-MM-dd');
}

// ─── Predict Next N Cycles ────────────────────────────────────────────────────

export function predictNextCycles(lastPeriodStart, stats, count = 3) {
  const predictions = [];
  let current = lastPeriodStart;

  for (let i = 0; i < count; i++) {
    const nextStart = format(
      addDays(parseISO(current), stats.avgCycleLength),
      'yyyy-MM-dd'
    );
    const nextEnd = format(
      addDays(parseISO(nextStart), stats.avgPeriodLength),
      'yyyy-MM-dd'
    );
    predictions.push({
      start_date: nextStart,
      end_date: nextEnd,
      cycle_length: stats.avgCycleLength,
      is_predicted: 1,
    });
    current = nextStart;
  }

  return predictions;
}

// ─── Anomaly Detection ────────────────────────────────────────────────────────

/**
 * Flags patterns worth telling the user about.
 * Returns array of { type, message, severity }
 */
export function detectAnomalies(cycles, stats) {
  const flags = [];
  const real = cycles.filter(c => !c.is_predicted && c.end_date);
  if (real.length < 3) return flags;

  const recent = real.slice(0, 3);

  // Short luteal phase (< 10 days) — relevant for fertility
  const recentCycleLengths = recent.map(c => {
    const next = real[real.indexOf(c) - 1];
    if (!next) return null;
    return differenceInDays(parseISO(next.start_date), parseISO(c.start_date));
  }).filter(Boolean);

  const shortLuteal = recentCycleLengths.filter(l => l < 24);
  if (shortLuteal.length >= 2) {
    flags.push({
      type: 'short_luteal',
      message: 'Your last few cycles have been shorter than average. Short luteal phases can affect fertility.',
      severity: 'info',
    });
  }

  // Irregular cycles (variance > 7 days)
  if (recentCycleLengths.length >= 2) {
    const max = Math.max(...recentCycleLengths);
    const min = Math.min(...recentCycleLengths);
    if (max - min > 7) {
      flags.push({
        type: 'irregular',
        message: `Your cycles have varied by ${max - min} days recently. Irregularity can be worth tracking.`,
        severity: 'info',
      });
    }
  }

  // Long cycle (> 35 days) — PCOS flag
  if (recentCycleLengths.some(l => l > 35)) {
    flags.push({
      type: 'long_cycle',
      message: 'One or more recent cycles were longer than 35 days. This can sometimes be associated with PCOS.',
      severity: 'info',
    });
  }

  return flags;
}

// ─── Pregnancy Utilities ──────────────────────────────────────────────────────

export function calcGestationalAge(lmpDate) {
  const days = differenceInDays(new Date(), parseISO(lmpDate));
  return {
    weeks: Math.floor(days / 7),
    days: days % 7,
    totalDays: days,
    edd: format(addDays(parseISO(lmpDate), 280), 'yyyy-MM-dd'),
  };
}

export function calcConceptionLikelihood(sexDate, lastPeriodStart, stats) {
  const phase = getPhaseForDate(sexDate, stats, lastPeriodStart);
  return {
    inFertileWindow: phase.inFertileWindow,
    phase: phase.phase,
    likelihood:
      phase.phase === PHASES.OVULATION
        ? 'high'
        : phase.inFertileWindow
        ? 'moderate'
        : 'low',
  };
}
