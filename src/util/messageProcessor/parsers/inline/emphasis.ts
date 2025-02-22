import type { Delimiter } from '../InlineState';
import type InlineState from '../InlineState';
import type { InlineRuleFn } from '../types';

import { CharCode } from '../../constants';
import scanDelimiters from '../../utils/scanDelimiters';

// Process *this* and _that_
// Insert each marker as a separate text token, and add it to delimiter list
const tokenize: InlineRuleFn = (state, silent) => {
  const start = state.pos;
  const marker = state.src.charCodeAt(start);

  if (silent) { return false; }

  if (marker !== CharCode.Underscore && marker !== CharCode.Asterisk) { return false; }

  const scanned = scanDelimiters(state.src, state.pos, state.posMax, marker === CharCode.Asterisk);

  for (let i = 0; i < scanned.length; i++) {
    const token = state.push('text', 0);
    token.content = String.fromCharCode(marker);

    state.delimiters.push({
      marker,
      length: scanned.length,
      token: state.tokens.length - 1,
      end: -1,
      open: scanned.canOpen,
      close: scanned.canClose,
    });
  }

  state.pos += scanned.length;

  return true;
};

const handlePostProcess = (state: InlineState, delimiters: Delimiter[]) => {
  const max = delimiters.length;

  for (let i = max - 1; i >= 0; i--) {
    const startDelim = delimiters[i];

    if (startDelim.marker !== CharCode.Underscore && startDelim.marker !== CharCode.Asterisk) {
      continue;
    }

    // Process only opening markers
    if (startDelim.end === -1) {
      continue;
    }

    const endDelim = delimiters[startDelim.end];

    // If the previous delimiter has the same marker and is adjacent to this one,
    // merge those into one strong delimiter.
    //
    // `<em><em>whatever</em></em>` -> `<strong>whatever</strong>`
    //
    const isStrong = i > 0
            && delimiters[i - 1].end === startDelim.end + 1
            // check that first two markers match and adjacent
            && delimiters[i - 1].marker === startDelim.marker
            && delimiters[i - 1].token === startDelim.token - 1
            // check that last two markers are adjacent (we can safely assume they match)
            && delimiters[startDelim.end + 1].token === endDelim.token + 1;

    const ch = String.fromCharCode(startDelim.marker);

    const tokenOpen = state.tokens[startDelim.token];
    tokenOpen.type = isStrong ? 'strong_open' : 'em_open';
    tokenOpen.markup = isStrong ? ch + ch : ch;
    tokenOpen.content = '';

    const tokenClose = state.tokens[endDelim.token];
    tokenClose.type = isStrong ? 'strong_close' : 'em_close';
    tokenClose.markup = isStrong ? ch + ch : ch;
    tokenClose.content = '';

    if (isStrong) {
      state.tokens[delimiters[i - 1].token].content = '';
      state.tokens[delimiters[startDelim.end + 1].token].content = '';
      i--;
    }
  }
};

// Walk through delimiter list and replace text tokens with tags
//
const postProcess: InlineRuleFn = (state) => {
  const tokensMeta = state.tokensMeta;
  const max = state.tokensMeta.length;

  handlePostProcess(state, state.delimiters);

  for (let curr = 0; curr < max; curr++) {
    if (tokensMeta[curr] && tokensMeta[curr]?.delimiters) {
      handlePostProcess(state, tokensMeta[curr]!.delimiters);
    }
  }
  return true;
};

export default {
  tokenize,
  postProcess,
};
