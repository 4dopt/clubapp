export const theme = {
  color: {
    // Light, sporty country-club palette
    surface: '#F4F1EA',           // warm parchment / golf fairway bunker sand
    onSurface: '#0F1B16',          // ink black-green
    surfaceSecondary: '#FFFFFF',
    onSurfaceSecondary: '#4A5C54',
    surfaceTertiary: '#EAE6DC',
    onSurfaceTertiary: '#7E8A85',
    surfaceInverse: '#0F1B16',     // dark for hero blocks / membership card text bg
    onSurfaceInverse: '#F4F1EA',

    // PRIMARY — Augusta-deep grass green
    brand: '#0E5A3A',
    brandPrimary: '#0E5A3A',
    onBrandPrimary: '#FFFFFF',
    brandSecondary: '#093A26',     // even deeper, for gradients
    brandTertiary: '#D7E8DE',      // tint surface for filled states
    onBrandTertiary: '#0E5A3A',

    // ACCENT — sport-lime (energetic, for points & CTAs)
    accent: '#16A567',
    onAccent: '#FFFFFF',
    accentSoft: '#E1F2E6',

    // Premium tier accent — tee/leather gold
    gold: '#C49A3E',

    // Status
    success: '#0E5A3A',
    warning: '#B36F00',
    error: '#B23A3A',
    onError: '#FFFFFF',
    info: '#3E5C82',

    // Lines
    border: '#E0DAD0',
    borderStrong: '#C6BFB2',
    divider: '#EAE6DC',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 },
  radius: { sm: 6, md: 12, lg: 20, xl: 28, pill: 999 },
  font: {
    display: 'System', // bold modern sans for sporty feel
    text: 'System',
  },
};

// Tier styling — green-tinted for Silver, gold for Gold, slate-platinum for Platinum
export const tierMeta = {
  Silver: {
    name: 'Silver',
    color: '#4A5C54',
    bg: '#D7E8DE',
    gradient: ['#15793F', '#0E5A3A', '#093A26'] as [string, string, string],
    next: 1000,
    prev: 0,
  },
  Gold: {
    name: 'Gold',
    color: '#8C6B12',
    bg: '#F4E2A6',
    gradient: ['#1D7E4A', '#0E5A3A', '#073A24'] as [string, string, string],
    next: 5000,
    prev: 1000,
  },
  Platinum: {
    name: 'Platinum',
    color: '#1F2A24',
    bg: '#E5E9E6',
    gradient: ['#0F1B16', '#1F2A24', '#0B1410'] as [string, string, string],
    next: 5000,
    prev: 5000,
  },
};

export type TierName = keyof typeof tierMeta;
