// src/theme/index.js
// Light + Dark botanical themes. Warm. Natural. Never neon.

const lightColors = {
  bg: '#FAF6F0', bgCard: '#FFFFFF', bgElevated: '#F5EFE6', bgInput: '#F0EBE3',
  primary: '#6B8C5F', primaryLight: '#8BAD7E', primaryDim: '#D4E4CE', primaryDeep: '#4A6640',
  accent: '#C4806A', accentLight: '#E8A896', accentDim: '#F4DDD7',
  phaseRed: '#C4806A', phaseOrange: '#D4A55A', phaseYellow: '#8BAD7E', phasePurple: '#8E7BAA',
  textPrimary: '#2C1F14', textSecondary: '#6B5344', textMuted: '#A08070', textInverse: '#FFFFFF',
  success: '#6B8C5F', warning: '#D4A55A', error: '#C4605A', info: '#7B9EAA',
  border: '#E8DDD4', borderLight: '#F0EBE3',
  overlay: 'rgba(44, 31, 20, 0.5)',
  isDark: false,
};

const darkColors = {
  // Warm dark — deep forest at night. NOT blue-black.
  bg: '#1A1812', bgCard: '#242018', bgElevated: '#2C2820', bgInput: '#322E26',
  primary: '#8BAD7E', primaryLight: '#A8C89E', primaryDim: '#2A3828', primaryDeep: '#6B8C5F',
  accent: '#E8A896', accentLight: '#F4C8B8', accentDim: '#3A2820',
  phaseRed: '#E8A896', phaseOrange: '#E8C07A', phaseYellow: '#A8C89E', phasePurple: '#B4A4D0',
  textPrimary: '#F0E8D8', textSecondary: '#C4A882', textMuted: '#7A6858', textInverse: '#1A1812',
  success: '#8BAD7E', warning: '#E8C07A', error: '#E8907A', info: '#9ABAC8',
  border: '#38302A', borderLight: '#2C2820',
  overlay: 'rgba(10, 8, 6, 0.7)',
  isDark: true,
};

const darkPhaseTheme = {
  menstrual: { bg: '#1F1510', accent: '#E8A896', soft: '#3A2820', gradient: ['#1F1510', '#251815'] },
  follicular: { bg: '#1C1A0E', accent: '#E8C07A', soft: '#38300A', gradient: ['#1C1A0E', '#221E0C'] },
  ovulation:  { bg: '#141A12', accent: '#A8C89E', soft: '#1E2E1A', gradient: ['#141A12', '#182416'] },
  luteal:     { bg: '#181220', accent: '#B4A4D0', soft: '#281E38', gradient: ['#181220', '#1E1628'] },
  unknown:    { bg: '#1A1812', accent: '#8BAD7E', soft: '#2A3828', gradient: ['#1A1812', '#242018'] },
};

const lightPhaseTheme = {
  menstrual:  { bg: '#FDF5F2', accent: '#C4806A', soft: '#F4DDD7', gradient: ['#FDF5F2', '#FAF0EC'] },
  follicular: { bg: '#FDF9F0', accent: '#D4A55A', soft: '#F5E8CA', gradient: ['#FDF9F0', '#FAF4E4'] },
  ovulation:  { bg: '#F8F9F0', accent: '#8BAD7E', soft: '#D4E4CE', gradient: ['#F8F9F0', '#F0F4EC'] },
  luteal:     { bg: '#F8F5FC', accent: '#8E7BAA', soft: '#E4DDF4', gradient: ['#F8F5FC', '#F4F0FA'] },
  unknown:    { bg: '#FAF6F0', accent: '#6B8C5F', soft: '#D4E4CE', gradient: ['#FAF6F0', '#F5EFE6'] },
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64 };
export const radius = { sm: 8, md: 14, lg: 20, xl: 28, full: 999 };

export const getShadows = (isDark) => ({
  sm: { shadowColor: isDark ? '#000' : '#C4A882', shadowOffset: { width: 0, height: 1 }, shadowOpacity: isDark ? 0.3 : 0.12, shadowRadius: 4, elevation: 2 },
  md: { shadowColor: isDark ? '#000' : '#C4A882', shadowOffset: { width: 0, height: 3 }, shadowOpacity: isDark ? 0.35 : 0.15, shadowRadius: 10, elevation: 4 },
  lg: { shadowColor: isDark ? '#000' : '#C4A882', shadowOffset: { width: 0, height: 6 }, shadowOpacity: isDark ? 0.4 : 0.18, shadowRadius: 18, elevation: 8 },
});

// These get replaced by useTheme() hook — kept for files that import directly
export let colors = lightColors;
export let phaseTheme = lightPhaseTheme;
export let shadows = getShadows(false);

export const getTheme = (isDark) => ({
  colors: isDark ? darkColors : lightColors,
  phaseTheme: isDark ? darkPhaseTheme : lightPhaseTheme,
  shadows: getShadows(isDark),
  spacing,
  radius,
  isDark,
});

export const typography = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5 },
  heading1: { fontSize: 24, lineHeight: 32, fontWeight: '600' },
  heading2: { fontSize: 20, lineHeight: 28, fontWeight: '500' },
  bodyLarge: { fontSize: 17, lineHeight: 26 },
  body: { fontSize: 15, lineHeight: 22 },
  bodySmall: { fontSize: 13, lineHeight: 19 },
  label: { fontSize: 11, lineHeight: 16, letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: '500' },
};

export default { colors, typography, spacing, radius, shadows, phaseTheme };
