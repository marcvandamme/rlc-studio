import type { Theme } from '../../hooks/useTheme';

export interface PlotPalette {
  surface: string;
  grid: string;
  axis: string;
  text: string;
  muted: string;
  faint: string;
  accent: string;
  accentSoft: string;
  inductive: string;
  capacitive: string;
  resonant: string;
  resistance: string;
  total: string;
}

export function plotPalette(theme: Theme): PlotPalette {
  if (theme === 'dark') {
    return {
      surface: '#0d1420',
      grid: '#1e293b',
      axis: '#475569',
      text: '#e6edf7',
      muted: '#94a3b8',
      faint: '#64748b',
      accent: '#2dd4bf',
      accentSoft: 'rgba(45, 212, 191, 0.16)',
      inductive: '#fbbf24',
      capacitive: '#60a5fa',
      resonant: '#a78bfa',
      resistance: '#2dd4bf',
      total: '#a78bfa',
    };
  }
  return {
    surface: '#ffffff',
    grid: '#e2e8f0',
    axis: '#94a3b8',
    text: '#0f172a',
    muted: '#64748b',
    faint: '#94a3b8',
    accent: '#0d9488',
    accentSoft: 'rgba(13, 148, 136, 0.12)',
    inductive: '#b45309',
    capacitive: '#2563eb',
    resonant: '#7c3aed',
    resistance: '#0f766e',
    total: '#7c3aed',
  };
}

export function phasorColor(
  palette: PlotPalette,
  color: 'resistance' | 'inductance' | 'capacitance' | 'total',
): string {
  switch (color) {
    case 'resistance':
      return palette.resistance;
    case 'inductance':
      return palette.inductive;
    case 'capacitance':
      return palette.capacitive;
    default:
      return palette.total;
  }
}
