import type { Position } from './types';

export const ANIMATION_DURATION = 0.167; // in seconds

export const COLOR_COMPONENT_COUNT = 3;
export const R_OFFSET = 0;
export const G_OFFSET = 1;
export const B_OFFSET = 2;
export const POSITION_COMPONENT_COUNT = 2;
export const X_OFFSET = 0;
export const Y_OFFSET = 1;
export const MAX_GRADIENT_STOP_COUNT = 4;

export const POSITIONS: readonly Position[] = [
  { x: 0.8, y: 0.1 },
  { x: 0.75, y: 0.4 },
  { x: 0.65, y: 0.75 },
  { x: 0.4, y: 0.8 },
  { x: 0.2, y: 0.9 },
  { x: 0.25, y: 0.6 },
  { x: 0.35, y: 0.25 },
  { x: 0.6, y: 0.2 },
];
