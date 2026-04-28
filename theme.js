/**
 * Fajr design tokens — import from this module only; do not hardcode hex values in UI.
 */

export const lightColors = {
  overlay: 'rgba(44, 44, 44, 0.35)',
  background: '#F5F0E8',
  surface: '#EDE8DC',
  surfaceElevated: '#E8E0D0',
  /** Default brand olive — strong on warm paper, pairs with existing accent gold */
  primary: '#606c38',
  /** Lighter olive for secondary emphasis / large fills without heavy contrast */
  primaryLight: '#7a8552',
  accent: '#C4954A',
  textPrimary: '#2C2C2C',
  textSecondary: '#7A7060',
  textMuted: '#B0A898',
  divider: '#D8D0C0',
  success: '#606c38',
  danger: '#a62121',
  plusGold: '#C4954A',
};

export const darkColors = {
  /** Neutral scrim so dark mode does not inherit an olive cast across themes. */
  overlay: 'rgba(18, 18, 20, 0.55)',
  /** Dark surfaces are theme-specific; see getColors(mode='dark', theme). */
  background: '#12110F',
  surface: '#1A1815',
  surfaceElevated: '#211E1A',
  primary: '#a3b06e',
  primaryLight: '#b8c489',
  accent: '#D2A35A',
  textPrimary: '#EEF1E6',
  textSecondary: '#C8C5BE',
  textMuted: '#8F8A81',
  divider: '#34312D',
  success: '#a3b06e',
  danger: '#b03333',
  plusGold: '#D2A35A',
};

/** @typedef {'main' | 'pink' | 'blue' | 'red' | 'orange' | 'purple' | 'brown' | 'gray'} ColorThemeId */

/** @type {ColorThemeId[]} */
export const COLOR_THEME_IDS = ['main', 'pink', 'blue', 'red', 'orange', 'purple', 'brown', 'gray'];

const DARK_THEME_SURFACES = {
  main: {
    background: '#0f1510',
    surface: '#161f17',
    surfaceElevated: '#1c2a1e',
    divider: '#2a3d2c',
    primary: '#5c7a5f',
    primaryLight: '#7a9e7e',
  },
  pink: {
    background: '#150f13',
    surface: '#1f161d',
    surfaceElevated: '#2a1c27',
    divider: '#3d2a38',
    primary: '#9e5c7a',
    primaryLight: '#c47a9e',
  },
  blue: {
    background: '#0f1215',
    surface: '#161a1f',
    surfaceElevated: '#1c222a',
    divider: '#2a333d',
    primary: '#5c7a9e',
    primaryLight: '#7a9ec4',
  },
  red: {
    background: '#150f0f',
    surface: '#1f1616',
    surfaceElevated: '#2a1c1c',
    divider: '#3d2a2a',
    primary: '#9e5c5c',
    primaryLight: '#c47a7a',
  },
  orange: {
    background: '#150f0a',
    surface: '#1f1610',
    surfaceElevated: '#2a1e14',
    divider: '#3d2e1a',
    primary: '#9e7a5c',
    primaryLight: '#c49e7a',
  },
  purple: {
    background: '#110f15',
    surface: '#191620',
    surfaceElevated: '#211c2a',
    divider: '#312a3d',
    primary: '#7a5c9e',
    primaryLight: '#9e7ac4',
  },
  brown: {
    background: '#120f0d',
    surface: '#1c1713',
    surfaceElevated: '#261f19',
    divider: '#3a2e26',
    primary: '#9e7a5c',
    primaryLight: '#c4a07a',
  },
  gray: {
    background: '#0f0f0f',
    surface: '#171717',
    surfaceElevated: '#202020',
    divider: '#2e2e2e',
    primary: '#7a7a7a',
    primaryLight: '#9e9e9e',
  },
};

/**
 * @param {'light' | 'dark'} mode
 * @param {ColorThemeId} [colorTheme]
 */
export function getColors(mode = 'light', colorTheme = 'main') {
  const base = mode === 'dark' ? { ...darkColors } : { ...lightColors };
  if (mode === 'dark') {
    const patch = DARK_THEME_SURFACES[colorTheme] || DARK_THEME_SURFACES.main;
    const { primary, primaryLight, divider } = patch;
    return {
      ...base,
      primary,
      primaryLight,
      divider,
      success: primary,
    };
  }
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
  const isDarkTheme =
    c.background === darkColors.background &&
    c.surface === darkColors.surface &&
    c.surfaceElevated === darkColors.surfaceElevated;

  if (isDarkTheme) {
    return {
      card: {
        elevation: 1,
        shadowColor,
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      modal: {
        elevation: 1,
        shadowColor,
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
    };
  }

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
