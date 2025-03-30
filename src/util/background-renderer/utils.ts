import type { Color } from './types';

export const hexToRgb = (hex: string): Color => {
  if (hex.startsWith('#')) {
    hex = hex.slice(1);
  }

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  return { r, g, b };
};
