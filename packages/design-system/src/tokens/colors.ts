// PfotenNetz Design Tokens - sourced from Stitch "PfotenNetz Haustierbetreuung App"
// These tokens must NOT be replaced with arbitrary defaults.
// They are the single source of truth for colors, spacing, typography, etc.

export const colors = {
  // Light Mode (Primary)
  light: {
    // Primary - Terracotta
    primary: '#E26D46',
    primaryHover: '#C8542F',
    primaryContainer: '#C0532F',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#FFFBFF',
    primaryFixed: '#FFDBD0',
    primaryFixedDim: '#FFB59E',
    onPrimaryFixed: '#390B00',
    onPrimaryFixedVariant: '#822704',

    // Secondary - Sage Green
    secondary: '#4B7C59',
    secondaryContainer: '#B7ECC2',
    onSecondary: '#FFFFFF',
    onSecondaryContainer: '#3C6D4B',
    secondaryFixed: '#BAEFC5',
    secondaryFixedDim: '#9ED3AA',
    onSecondaryFixed: '#00210E',
    onSecondaryFixedVariant: '#1F5031',

    // Tertiary - Amber/Ochre (Warning)
    tertiary: '#E68A00',
    tertiaryContainer: '#A96400',
    onTertiary: '#FFFFFF',
    onTertiaryContainer: '#FFFBFF',
    tertiaryFixed: '#FFDCBD',
    tertiaryFixedDim: '#FFB86E',
    onTertiaryFixed: '#2C1600',
    onTertiaryFixedVariant: '#693C00',

    // Error - Crimson
    error: '#BA1A1A',
    errorContainer: '#FFDAD6',
    onError: '#FFFFFF',
    onErrorContainer: '#93000A',

    // Success - Field Green
    success: '#2E7D32',
    successContainer: '#E8F5E9',
    onSuccess: '#FFFFFF',
    onSuccessContainer: '#1B5E20',

    // Surfaces
    surface: '#FFF8F5',
    surfaceBright: '#FFF8F5',
    surfaceDim: '#E5D7D0',
    surfaceContainerLowest: '#FFFFFF',
    surfaceContainerLow: '#FFF1E9',
    surfaceContainer: '#F9EBE4',
    surfaceContainerHigh: '#F3E6DE',
    surfaceContainerHighest: '#EEE0D8',
    surfaceVariant: '#EEE0D8',

    // Text
    onSurface: '#211A16',
    onSurfaceVariant: '#57423C',
    onBackground: '#211A16',

    // Outline
    outline: '#8A726A',
    outlineVariant: '#DEC0B7',

    // Inverse
    inverseSurface: '#362F2A',
    inverseOnSurface: '#FCEEE6',
    inversePrimary: '#FFB59E',

    // Background
    background: '#FFF8F5',

    // Surface Tint
    surfaceTint: '#A23E1B',
  },

  // Dark Mode
  dark: {
    primary: '#F0825B',
    primaryHover: '#E87045',
    primaryContainer: '#C0532F',
    onPrimary: '#362F2A',
    onPrimaryContainer: '#FFFBFF',
    primaryFixed: '#FFDBD0',
    primaryFixedDim: '#FFB59E',
    onPrimaryFixed: '#390B00',
    onPrimaryFixedVariant: '#822704',

    secondary: '#9ED3AA',
    secondaryContainer: '#386847',
    onSecondary: '#1A1A1A',
    onSecondaryContainer: '#BAEFC5',
    secondaryFixed: '#BAEFC5',
    secondaryFixedDim: '#9ED3AA',
    onSecondaryFixed: '#00210E',
    onSecondaryFixedVariant: '#1F5031',

    tertiary: '#FFB86E',
    tertiaryContainer: '#874F00',
    onTertiary: '#1A1A1A',
    onTertiaryContainer: '#FFDCBD',
    tertiaryFixed: '#FFDCBD',
    tertiaryFixedDim: '#FFB86E',
    onTertiaryFixed: '#2C1600',
    onTertiaryFixedVariant: '#693C00',

    error: '#FFB4AB',
    errorContainer: '#93000A',
    onError: '#362F2A',
    onErrorContainer: '#FFDAD6',

    success: '#81C784',
    successContainer: '#1B5E20',
    onSuccess: '#1A1A1A',
    onSuccessContainer: '#E8F5E9',

    surface: '#1A1A1A',
    surfaceBright: '#262626',
    surfaceDim: '#121212',
    surfaceContainerLowest: '#101010',
    surfaceContainerLow: '#1A1A1A',
    surfaceContainer: '#262626',
    surfaceContainerHigh: '#2E2E2E',
    surfaceContainerHighest: '#383838',
    surfaceVariant: '#383838',

    onSurface: '#F9F8F6',
    onSurfaceVariant: '#B8B2AD',
    onBackground: '#F9F8F6',

    outline: '#766C66',
    outlineVariant: '#57423C',

    inverseSurface: '#FFF8F5',
    inverseOnSurface: '#211A16',
    inversePrimary: '#E26D46',

    background: '#1A1A1A',

    surfaceTint: '#F0825B',
  },
} as const;

export type ColorMode = 'light' | 'dark';
export type LightColorToken = keyof typeof colors.light;
export type DarkColorToken = keyof typeof colors.dark;
