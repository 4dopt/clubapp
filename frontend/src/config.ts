export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.EXPO_PUBLIC_API_BASE) ||
  'http://localhost:8000';
