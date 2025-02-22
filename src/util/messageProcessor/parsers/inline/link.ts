import type InlineState from '../InlineState';
import type { InlineRuleFn } from '../types';

import { CharCode } from '../../constants';
import isSpace from '../../utils/isSpace';

function parseLinkLabel(state: InlineState, start: number, disableNested: boolean = false) {
  let level; let found; let marker; let
    prevPos;

  const max = state.posMax;
  const oldPos = state.pos;

  state.pos = start + 1;
  level = 1;

  while (state.pos < max) {
    marker = state.src.charCodeAt(state.pos);
    if (marker === CharCode.RSquareBracket) {
      level--;
      if (level === 0) {
        found = true;
        break;
      }
    }

    prevPos = state.pos;
    state.md.inline.skipToken(state);
    if (marker === CharCode.LParenthesis) {
      if (prevPos === state.pos - 1) {
        level++;
      } else if (disableNested) {
        state.pos = oldPos;
        return -1;
      }
    }
  }

  let labelEnd = -1;

  if (found) {
    labelEnd = state.pos;
  }

  // restore old state
  state.pos = oldPos;

  return labelEnd;
}

function parseLinkDestination(str: string, start: number, max: number) {
  let code;
  let pos = start;

  const result = {
    ok: false,
    pos: 0,
    str: '',
  };

  if (str.charCodeAt(pos) === CharCode.LessThan) {
    pos++;
    while (pos < max) {
      code = str.charCodeAt(pos);
      if (code === CharCode.LineFeed) { return result; }
      if (code === CharCode.LessThan) { return result; }
      if (code === CharCode.GreaterThan) {
        result.pos = pos + 1;
        result.str = str.slice(start + 1, pos);
        result.ok = true;
        return result;
      }
      if (code === CharCode.Backslash && pos + 1 < max) {
        pos += 2;
        continue;
      }

      pos++;
    }
    return result;
  }

  let level = 0;
  while (pos < max) {
    code = str.charCodeAt(pos);

    if (code === CharCode.Space) { break; }

    // ascii control characters
    if (code < CharCode.Space || code === CharCode.Delete) { break; }

    if (code === CharCode.Backslash && pos + 1 < max) {
      if (str.charCodeAt(pos + 1) === CharCode.Space) { break; }
      pos += 2;
      continue;
    }

    if (code === CharCode.LParenthesis) {
      level++;
      if (level > 32) { return result; }
    }

    if (code === CharCode.RParenthesis) {
      if (level === 0) { break; }
      level--;
    }

    pos++;
  }

  if (start === pos) { return result; }
  if (level !== 0) { return result; }

  result.str = str.slice(start, pos);
  result.pos = pos;
  result.ok = true;
  return result;
}

// Process [link](<to>)
const link: InlineRuleFn = (state, silent) => {
  let code; let res;
  let href = '';
  let start = state.pos;
  let parseReference = true;

  if (state.src.charCodeAt(state.pos) !== CharCode.LSquareBracket) { return false; }

  const max = state.posMax;
  const labelStart = state.pos + 1;
  const labelEnd = parseLinkLabel(state, state.pos, true);

  // parser failed to find ']', so it's not a valid link
  if (labelEnd < 0) { return false; }

  let pos = labelEnd + 1;
  if (pos < max && state.src.charCodeAt(pos) === CharCode.LParenthesis) {
    // [link](  <href>  )
    //        ^^ skipping these spaces
    pos++;
    for (; pos < max; pos++) {
      code = state.src.charCodeAt(pos);
      if (!isSpace(code) && code !== CharCode.LineFeed) { break; }
    }
    if (pos >= max) { return false; }

    // [link](  <href>  )
    //          ^^^^^^ parsing link destination
    start = pos;
    res = parseLinkDestination(state.src, pos, state.posMax);
    if (res.ok) {
      href = res.str;
      if (href) {
        pos = res.pos;
      } else {
        href = '';
      }

      // [link](  <href>  )
      //                ^^ skipping these spaces
      for (; pos < max; pos++) {
        code = state.src.charCodeAt(pos);
        if (!isSpace(code) && code !== CharCode.LineFeed) { break; }
      }
    }
    pos++;
  }

  //
  // We found the end of the link, and know for a fact it's a valid link;
  // so all that's left to do is to call tokenizer.
  //
  if (!silent) {
    state.pos = labelStart;
    state.posMax = labelEnd;

    const tokenOpen = state.push('link_open', 1);
    tokenOpen.attrSet('href', href);

    state.linkLevel++;
    state.md.inline.tokenize(state);
    state.linkLevel--;

    state.push('link_close', -1);
  }

  state.pos = pos;
  state.posMax = max;
  return true;
};

export default link;
