// PfotenNetz Typography Tokens - Plus Jakarta Sans exclusively from Stitch

export const fontFamily = {
  sans: 'Plus Jakarta Sans',
  mono: 'JetBrains Mono',
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;

export const lineHeight = {
  tight: 1.1,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
} as const;

export const letterSpacing = {
  tighter: '-0.02em',
  tight: '-0.01em',
  normal: '0em',
  wide: '0.02em',
  wider: '0.04em',
} as const;

export const fontSize = {
  // Display / Headlines
  'headline-xl': { size: '36px', lineHeight: '44px', weight: 800, letterSpacing: '-0.02em' },
  'headline-xl-mobile': { size: '28px', lineHeight: '36px', weight: 800, letterSpacing: '-0.01em' },
  'headline-lg': { size: '28px', lineHeight: '36px', weight: 700, letterSpacing: '-0.01em' },
  'headline-lg-mobile': { size: '22px', lineHeight: '30px', weight: 700, letterSpacing: '0em' },
  'headline-md': { size: '20px', lineHeight: '28px', weight: 700, letterSpacing: '0em' },
  'headline-sm': { size: '18px', lineHeight: '24px', weight: 600, letterSpacing: '0em' },

  // Body
  'body-lg': { size: '16px', lineHeight: '26px', weight: 400, letterSpacing: '0em' },
  'body-md': { size: '15px', lineHeight: '24px', weight: 400, letterSpacing: '0em' },
  'body-sm': { size: '13px', lineHeight: '20px', weight: 400, letterSpacing: '0em' },

  // Labels / UI
  'label-lg': { size: '15px', lineHeight: '20px', weight: 600, letterSpacing: '0em' },
  'label-md': { size: '13px', lineHeight: '18px', weight: 600, letterSpacing: '0em' },
  'label-sm': { size: '11px', lineHeight: '14px', weight: 700, letterSpacing: '0.04em' },
} as const;

export type FontSizeToken = keyof typeof fontSize;

export const typographyStyles: Record<FontSizeToken, string> = {
  'headline-xl': 'text-[36px] leading-[44px] font-extrabold tracking-[-0.02em] font-sans',
  'headline-xl-mobile': 'text-[28px] leading-[36px] font-extrabold tracking-[-0.01em] font-sans',
  'headline-lg': 'text-[28px] leading-[36px] font-bold tracking-[-0.01em] font-sans',
  'headline-lg-mobile': 'text-[22px] leading-[30px] font-bold font-sans',
  'headline-md': 'text-[20px] leading-[28px] font-bold font-sans',
  'headline-sm': 'text-[18px] leading-[24px] font-semibold font-sans',
  'body-lg': 'text-[16px] leading-[26px] font-normal font-sans',
  'body-md': 'text-[15px] leading-[24px] font-normal font-sans',
  'body-sm': 'text-[13px] leading-[20px] font-normal font-sans',
  'label-lg': 'text-[15px] leading-[20px] font-semibold font-sans',
  'label-md': 'text-[13px] leading-[18px] font-semibold font-sans',
  'label-sm': 'text-[11px] leading-[14px] font-extrabold tracking-[0.04em] font-sans',
};
