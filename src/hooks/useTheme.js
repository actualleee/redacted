// src/hooks/useTheme.js
// Use this in every component instead of importing colors directly
import { useAppStore } from '../stores';
import { getTheme } from '../theme';

export function useTheme() {
  const { darkMode } = useAppStore();
  return getTheme(darkMode);
}
