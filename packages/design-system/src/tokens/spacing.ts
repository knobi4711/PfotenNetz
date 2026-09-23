// PfotenNetz Spacing Tokens - 4px baseline rhythm from Stitch

export const spacing = {
  // Base units (4px rhythm)
  space0: '0',
  space1: '0.25rem', // 4px
  space2: '0.5rem', // 8px
  space3: '0.75rem', // 12px
  space4: '1rem', // 16px - base unit
  space5: '1.25rem', // 20px
  space6: '1.5rem', // 24px
  space8: '2rem', // 32px
  space10: '2.5rem', // 40px
  space12: '3rem', // 48px
  space16: '4rem', // 64px

  // Semantic spacing aliases
  spaceXs: '0.25rem', // 4px
  spaceSm: '0.5rem', // 8px
  spaceMd: '1rem', // 16px
  spaceLg: '1.5rem', // 24px
  spaceXl: '2rem', // 32px
  space2xl: '3rem', // 48px

  // Gutters (responsive)
  gutter: '1rem', // Mobile: 16px
  gutterTablet: '1.5rem', // Tablet: 24px
  gutterDesktop: '2rem', // Desktop: 32px

  // Margins (responsive)
  margin: '1rem', // Mobile: 16px
  marginTablet: '2rem', // Tablet: 32px
  marginDesktop: '3rem', // Desktop: 48px

  // Component specific
  cardPadding: '1.5rem', // 24px - inner card padding
  cardGap: '1rem', // 16px - gap between cards
  sectionGap: '2rem', // 32px - major sections
  inlineGap: '0.5rem', // 8px - inline elements
  touchTargetMin: '3rem', // 48px - minimum touch target
} as const;

export type SpacingToken = keyof typeof spacing;
