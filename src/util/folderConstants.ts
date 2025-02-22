import type { IconName } from '../types/icons';

// All unexisting icons are replaced with bugs.
export const EMOJI_TO_ICON_MAP: Record<string, IconName> = {
  '🐱': 'animals',
  '📕': 'bug',
  '💰': 'cash-circle',
  '🎮': 'bug',
  '💡': 'lamp',
  '🤖': 'bots',
};
