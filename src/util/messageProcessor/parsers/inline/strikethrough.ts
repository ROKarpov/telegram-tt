import type { Delimiter } from '../InlineState';
import type InlineState from '../InlineState';
import type { InlineRuleFn } from '../types';

import { CharCode } from '../../constants';
import scanDelimiters from '../../utils/scanDelimiters';

// ~~strike through~~
//

// Insert each marker as a separate text token, and add it to delimiter list
//
const tokenize: InlineRuleFn = (state, silent) => {
  const start = state.pos;
  const marker = state.src.charCodeAt(start);

  if (silent) { return false; }

  if (marker !== CharCode.Tilde) { return false; }

  const scanned = scanDelimiters(state.src, state.pos, state.posMax, true);
  let len = scanned.length;
  const ch = String.fromCharCode(marker);

  if (len < 2) { return false; }

  let token;

  if (len % 2) {
    token = state.push('text', 0);
    token.content = ch;
    len--;
  }

  for (let i = 0; i < len; i += 2) {
    token = state.push('text', 0);
    token.content = ch + ch;

    state.delimiters.push({
      marker,
      length: 0, // disable "rule of 3" length checks meant for emphasis
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
  let token;
  const loneMarkers = [];
  const max = delimiters.length;

  for (let i = 0; i < max; i++) {
    const startDelim = delimiters[i];

    if (startDelim.marker !== CharCode.Tilde) {
      continue;
    }

    if (startDelim.end === -1) {
      continue;
    }

    const endDelim = delimiters[startDelim.end];

    token = state.tokens[startDelim.token];
    token.type = 'strikethrough_open';
    token.markup = '~~';
    token.content = '';

    token = state.tokens[endDelim.token];
    token.type = 'strikethrough_close';
    token.markup = '~~';
    token.content = '';

    if (state.tokens[endDelim.token - 1].type === 'text'
            && state.tokens[endDelim.token - 1].content === '~') {
      loneMarkers.push(endDelim.token - 1);
    }
  }

  // If a marker sequence has an odd number of characters, it's splitted
  // like this: `~~~~~` -> `~` + `~~` + `~~`, leaving one marker at the
  // start of the sequence.
  //
  // So, we have to move all those markers after subsequent s_close tags.
  //
  while (loneMarkers.length) {
    const i = loneMarkers.pop() ?? 0;
    let j = i + 1;

    while (j < state.tokens.length && state.tokens[j].type === 's_close') {
      j++;
    }

    j--;

    if (i !== j) {
      token = state.tokens[j];
      state.tokens[j] = state.tokens[i];
      state.tokens[i] = token;
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
