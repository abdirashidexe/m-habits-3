/**
 * Fajr design tokens — import from this module only; do not hardcode hex values in UI.
 */

export const lightColors = {
  overlay: 'rgba(44, 44, 44, 0.35)',
  background: '#F5F0E8',
  surface: '#EDE8DC',
  surfaceElevated: '#E8E0D0',
  primary: '#5C7A5F',
  primaryLight: '#7A9E7E',
  accent: '#C4954A',
  textPrimary: '#2C2C2C',
  textSecondary: '#7A7060',
  textMuted: '#B0A898',
  divider: '#D8D0C0',
  success: '#5C7A5F',
  danger: '#C4614A',
  plusGold: '#C4954A',
};

export const darkColors = {
  overlay: 'rgba(0, 0, 0, 0.45)',
  background: '#12110F',
  surface: '#1A1815',
  surfaceElevated: '#211E1A',
  primary: '#7A9E7E',
  primaryLight: '#9BBDA0',
  accent: '#D2A35A',
  textPrimary: '#F0EAE0',
  textSecondary: '#BEB4A4',
  textMuted: '#8E867A',
  divider: '#2C2823',
  success: '#7A9E7E',
  danger: '#D06B55',
  plusGold: '#D2A35A',
};

/** @typedef {'main' | 'pink' | 'blue' | 'red' | 'orange' | 'purple' | 'brown' | 'gray'} ColorThemeId */

/** @type {ColorThemeId[]} */
export const COLOR_THEME_IDS = ['main', 'pink', 'blue', 'red', 'orange', 'purple', 'brown', 'gray'];

/**
 * @param {'light' | 'dark'} mode
 * @param {ColorThemeId} [colorTheme]
 */
export function getColors(mode = 'light', colorTheme = 'main') {
  const base = mode === 'dark' ? { ...darkColors } : { ...lightColors };
  if (colorTheme === 'pink') {
    const patch =
      mode === 'dark'
        ? { primary: '#C97B92', primaryLight: '#E09AAC', success: '#C97B92' }
        : { primary: '#9B5B6E', primaryLight: '#B87A8C', success: '#9B5B6E' };
    return { ...base, ...patch };
  }
  if (colorTheme === 'blue') {
    const patch =
      mode === 'dark'
        ? { primary: '#6A9BD4', primaryLight: '#8BB5E8', success: '#6A9BD4' }
        : { primary: '#4A6B8A', primaryLight: '#6A8FB0', success: '#4A6B8A' };
    return { ...base, ...patch };
  }
  if (colorTheme === 'red') {
    const patch =
      mode === 'dark'
        ? { primary: '#E07070', primaryLight: '#F09898', success: '#E07070' }
        : { primary: '#A63D3D', primaryLight: '#C45A5A', success: '#A63D3D' };
    return { ...base, ...patch };
  }
  if (colorTheme === 'orange') {
    const patch =
      mode === 'dark'
        ? { primary: '#E88A4A', primaryLight: '#F5AC72', success: '#E88A4A' }
        : { primary: '#C05621', primaryLight: '#D97A40', success: '#C05621' };
    return { ...base, ...patch };
  }
  if (colorTheme === 'purple') {
    const patch =
      mode === 'dark'
        ? { primary: '#9B7EC8', primaryLight: '#B9A0DC', success: '#9B7EC8' }
        : { primary: '#6B4C8A', primaryLight: '#8A6BAE', success: '#6B4C8A' };
    return { ...base, ...patch };
  }
  if (colorTheme === 'brown') {
    const patch =
      mode === 'dark'
        ? { primary: '#A88B72', primaryLight: '#C4A88C', success: '#A88B72' }
        : { primary: '#6D4C3A', primaryLight: '#8B684E', success: '#6D4C3A' };
    return { ...base, ...patch };
  }
  if (colorTheme === 'gray') {
    const patch =
      mode === 'dark'
        ? { primary: '#B8B8B8', primaryLight: '#D4D4D4', success: '#B8B8B8' }
        : { primary: '#3D3D3D', primaryLight: '#5C5C5C', success: '#3D3D3D' };
    return { ...base, ...patch };
  }
  return base;
}

export function makeShadows(c) {
  const shadowColor = c.textPrimary;
  return {
    card: {
      elevation: 2,
      shadowColor,
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    },
    modal: {
      elevation: 8,
      shadowColor,
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
    },
  };
}


export const typography = {
  displayLarge: { fontFamily: 'Poppins',fontSize: 28+3, fontWeight: '700' },
  displayMedium: { fontFamily: 'Poppins',fontSize: 22+3, fontWeight: '700', marginBottom: 18 },
  heading: { fontFamily: 'Poppins',fontSize: 18+3, fontWeight: '600' },
  subheading: { fontFamily: 'Poppins',fontSize: 15+3, fontWeight: '600' },
  body: { fontFamily: 'Poppins',fontSize: 14+3, fontWeight: '400' },
  /** Same scale as body; used under screen titles (Habits, Stats). */
  subtext2: { fontFamily: 'Poppins', fontSize: 14 + 3, fontWeight: '400' },
  bodySmall: { fontFamily: 'Poppins',fontSize: 13+3, fontWeight: '400' },
  caption: { fontFamily: 'Poppins',fontSize: 12+2, fontWeight: '400' },
  label: {
    fontFamily: 'Poppins',fontSize: 11+3,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const shadows = makeShadows(lightColors);

export const colors = lightColors;

export const theme = {
  colors,
  typography,
  spacing,
  radii,
  shadows,
};
