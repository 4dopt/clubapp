export const theme = {
  color: {
    surface: '#0E1210',
    onSurface: '#F4F5F0',
    surfaceSecondary: '#161B18',
    onSurfaceSecondary: '#C2C5C0',
    surfaceTertiary: '#1E2521',
    onSurfaceTertiary: '#A3A8A1',
    surfaceInverse: '#EAECE8',
    onSurfaceInverse: '#0E1210',
    brand: '#D4AF37',
    brandPrimary: '#D4AF37',
    onBrandPrimary: '#1A1504',
    brandSecondary: '#C39D2C',
    brandTertiary: '#433610',
    onBrandTertiary: '#E9D18A',
    success: '#2D6646',
    onSuccess: '#E3F0E8',
    warning: '#A37522',
    error: '#8A3333',
    onError: '#F5D6D6',
    info: '#4A5852',
    border: '#2A322D',
    borderStrong: '#3D4741',
    divider: '#1E2521',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 },
  radius: { sm: 6, md: 12, lg: 20, pill: 999 },
  font: {
    display: 'serif', // Cormorant Garamond not loaded — fall back gracefully to serif so the luxe vibe still reads
    text: 'System',
  },
};

export const tierMeta = {
  Silver: {
    name: 'Silver',
    color: '#C2C5C0',
    gradient: ['#1E2521', '#0E1210'] as [string, string],
    next: 1000,
    prev: 0,
  },
  Gold: {
    name: 'Gold',
    color: '#D4AF37',
    gradient: ['#2A2410', '#0E1210'] as [string, string],
    next: 5000,
    prev: 1000,
  },
  Platinum: {
    name: 'Platinum',
    color: '#E9D18A',
    gradient: ['#3D4741', '#161B18'] as [string, string],
    next: 5000,
    prev: 5000,
  },
};

export type TierName = keyof typeof tierMeta;
