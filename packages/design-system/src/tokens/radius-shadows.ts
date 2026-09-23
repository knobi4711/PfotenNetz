// PfotenNetz Border Radius & Shadows Tokens - from Stitch

export const borderRadius = {
  none: '0',
  sm: '0.5rem', // 8px - inputs, small chips
  DEFAULT: '1rem', // 16px - default cards
  md: '1.5rem', // 24px - large cards
  lg: '2rem', // 32px - hero areas
  xl: '3rem', // 48px
  full: '9999px', // pills, buttons, avatars
} as const;

export type BorderRadiusToken = keyof typeof borderRadius;

export const shadows = {
  // Level 0 - None
  none: 'none',

  // Level 1 - Static Cards & Modules
  level1: {
    light: '0 2px 8px rgba(168,128,105,0.08), 0 1px 2px rgba(0,0,0,0.04)',
    dark: '0 2px 8px rgba(0,0,0,0.35)',
  },

  // Level 2 - Interactive Floating Elements, Bottom Sheets
  level2: {
    light: '0 8px 24px rgba(140,95,75,0.12), 0 2px 6px rgba(0,0,0,0.04)',
    dark: '0 8px 24px rgba(0,0,0,0.5)',
  },

  // Level 3 - Emergency Toasts & Modals
  level3: {
    light: '0 16px 40px rgba(80,50,40,0.16)',
    dark: '0 16px 40px rgba(0,0,0,0.75)',
  },

  // Component-specific shadows
  card: 'var(--shadow-level-1)',
  cardHover: 'var(--shadow-level-2)',
  fab: '0 12px 28px rgba(159,60,25,0.35)',
  modal: 'var(--shadow-level-3)',
  dropdown: 'var(--shadow-level-2)',
  toast: 'var(--shadow-level-3)',
} as const;

export type ShadowToken = keyof typeof shadows;
