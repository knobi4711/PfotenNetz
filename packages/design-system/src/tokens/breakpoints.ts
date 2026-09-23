// PfotenNetz Breakpoints - from Stitch Design System

export const breakpoints = {
  mobile: '0px', // < 768px
  tablet: '768px', // 768px - 1024px
  desktop: '1024px', // > 1024px
  wide: '1280px', // > 1280px
} as const;

export const containerMaxWidth = {
  mobile: '100%',
  tablet: '720px',
  desktop: '1200px',
} as const;

export const mediaQueries = {
  mobile: `@media (max-width: 767px)`,
  tablet: `@media (min-width: 768px) and (max-width: 1023px)`,
  desktop: `@media (min-width: 1024px)`,
  wide: `@media (min-width: 1280px)`,
  tabletAndUp: `@media (min-width: 768px)`,
  desktopAndUp: `@media (min-width: 1024px)`,
  mobileOnly: `@media (max-width: 767px)`,
} as const;

export type BreakpointToken = keyof typeof breakpoints;
