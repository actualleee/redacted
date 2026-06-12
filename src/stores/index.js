import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAppStore = create((set, get) => ({
  isLocked: true,
  isDecoyMode: false,
  isLoading: true,
  dbReady: false,
  onboardingDone: false,
  settings: null,
  darkMode: false,

  setLocked: (locked) => set({ isLocked: locked }),
  setDecoyMode: (decoy) => set({ isDecoyMode: decoy }),
  setLoading: (loading) => set({ isLoading: loading }),
  setDbReady: (ready) => set({ dbReady: ready }),
  setSettings: (settings) => set({ settings, onboardingDone: settings?.onboarding_done === 1 }),
  updateSettings: (partial) => set(state => ({ settings: { ...state.settings, ...partial } })),
  setDarkMode: async (val) => {
    set({ darkMode: val });
    try { await AsyncStorage.setItem('redacted_dark_mode', val ? '1' : '0'); } catch {}
  },
  loadDarkMode: async () => {
    try {
      const val = await AsyncStorage.getItem('redacted_dark_mode');
      set({ darkMode: val === '1' });
    } catch {}
  },
}));

export const useCycleStore = create((set) => ({
  currentCycle: null, recentCycles: [], cycleStats: { avgCycleLength: 28, avgPeriodLength: 5, avgLutealLength: 14, confidence: 0 },
  todayPhase: null, predictions: [], anomalies: [],
  setCurrentCycle: (c) => set({ currentCycle: c }),
  setRecentCycles: (c) => set({ recentCycles: c }),
  setCycleStats: (s) => set({ cycleStats: s }),
  setTodayPhase: (p) => set({ todayPhase: p }),
  setPredictions: (p) => set({ predictions: p }),
  setAnomalies: (a) => set({ anomalies: a }),
}));

export const useTodayStore = create((set) => ({
  date: new Date().toISOString().split('T')[0],
  log: null, symptoms: [], sexLogs: [], medications: [], conditionLog: null,
  setDate: (d) => set({ date: d }),
  setLog: (l) => set({ log: l }),
  setSymptoms: (s) => set({ symptoms: s }),
  setSexLogs: (s) => set({ sexLogs: s }),
  setMedications: (m) => set({ medications: m }),
  setConditionLog: (c) => set({ conditionLog: c }),
  updateLog: (partial) => set(state => ({ log: state.log ? { ...state.log, ...partial } : partial })),
  addSymptom: (s) => set(state => ({ symptoms: [...state.symptoms, s] })),
  removeSymptom: (id) => set(state => ({ symptoms: state.symptoms.filter(s => s.id !== id) })),
}));

export const useCalendarStore = create((set) => ({
  selectedDate: new Date().toISOString().split('T')[0],
  viewMonth: new Date().toISOString().slice(0, 7),
  markedDates: {},
  setSelectedDate: (d) => set({ selectedDate: d }),
  setViewMonth: (m) => set({ viewMonth: m }),
  setMarkedDates: (m) => set({ markedDates: m }),
}));

export const usePregnancyStore = create((set) => ({
  pregnancyMode: false, lmpDate: null, edd: null, gestationalWeeks: null, gestationalDays: null, todayPregnancyLog: null,
  setPregnancyMode: (m) => set({ pregnancyMode: m }),
  setLmpDate: (d) => set({ lmpDate: d }),
  setEdd: (d) => set({ edd: d }),
  setGestational: (w, d) => set({ gestationalWeeks: w, gestationalDays: d }),
  setTodayPregnancyLog: (l) => set({ todayPregnancyLog: l }),
}));
