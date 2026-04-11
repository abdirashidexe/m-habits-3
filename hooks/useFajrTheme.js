import { useMemo } from 'react';

import { useApp } from '../context/AppContext';
import { getColors, makeShadows, typography, spacing, radii } from '../theme';

export function useFajrTheme() {
  const { state } = useApp();
  const mode = state.userProfile.darkMode ? 'dark' : 'light';
  const colorTheme = state.userProfile.colorTheme || 'main';

  const colors = useMemo(() => getColors(mode, colorTheme), [mode, colorTheme]);
  const shadows = useMemo(() => makeShadows(colors), [colors]);

  return { mode, colors, shadows, typography, spacing, radii };
}

