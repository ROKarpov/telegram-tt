import type { InlineRuleFn } from '../types';

import isTerminatorChar from '../../utils/isTerminatorChar';

const text: InlineRuleFn = (state, silent) => {
  let pos = state.pos;

  while (pos < state.posMax && !isTerminatorChar(state.src.charCodeAt(pos))) {
    pos++;
  }

  if (pos === state.pos) { return false; }

  if (!silent) { state.pending += state.src.slice(state.pos, pos); }

  state.pos = pos;

  return true;
};

export default text;
