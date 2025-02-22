// Process html tags

// Regexps to match html elements
import type { InlineRuleFn } from '../types';

import { CharCode } from '../../constants';

const SELF_CLOSING_TAGS = ['img', 'br'];

function isLetter(ch: number) {
  /* eslint no-bitwise:0 */
  const lcCh = ch | CharCode.Space; // to lower case
  return (lcCh >= CharCode.a) && (lcCh <= CharCode.z);
}

function isTagTerminate(ch: number) {
  return ch === CharCode.Slash || ch === CharCode.GreaterThan;
}

function isSeparator(ch: number): boolean {
  return ch === CharCode.Space || ch === CharCode.LineFeed;
}
function isTagNameEnd(ch: number) {
  return isSeparator(ch) || isTagTerminate(ch);
}

function isAttrNameChar(ch: number) {
  return isLetter(ch) || ch === CharCode.Minus;
}

function isSelfClosing(tag: string): boolean {
  return SELF_CLOSING_TAGS.includes(tag);
}

function scanTagName(str: string, startPos: number, posMax: number) {
  let pos = startPos;
  while (pos < posMax && isLetter(str.charCodeAt(pos))) {
    ++pos;
  }
  return pos;
}

function scanAttrName(str: string, startPos: number, posMax: number) {
  let pos = startPos;
  while (pos < posMax && isAttrNameChar(str.charCodeAt(pos))) {
    ++pos;
  }
  return pos;
}
function scanAttrValue(str: string, startPos: number, posMax: number) {
  let pos = startPos;
  while (pos < posMax && str.charCodeAt(pos) !== CharCode.Quote) {
    ++pos;
  }
  return pos;
}

function skipSpaces(str: string, startPos: number, posMax: number) {
  let pos = startPos;
  while (pos < posMax && isSeparator(str.charCodeAt(pos))) {
    ++pos;
  }
  return pos;
}

const htmlTag: InlineRuleFn = (state, silent) => {
  // Check start
  const max = state.posMax;
  const src = state.src;
  let pos = state.pos;

  if (src.charCodeAt(pos) !== CharCode.LessThan
        || pos + 2 >= max) {
    return false;
  }

  // Quick fail on second char
  let ch = src.charCodeAt(pos + 1);
  if (!(ch === CharCode.Slash || isLetter(ch))) {
    return false;
  }

  const isClosingTag = ch === CharCode.Slash;
  if (isClosingTag) {
    ++pos;
  }

  ++pos;
  const tagEnd = scanTagName(src, pos, max);

  if (tagEnd >= max || !isTagNameEnd(src.charCodeAt(tagEnd))) {
    return false;
  }
  const tagName = src.substring(pos, tagEnd);
  const attrs: [string, string][] = [];
  pos = tagEnd;
  ch = src.charCodeAt(pos);
  while (pos < max && !isTagTerminate(ch)) {
    pos = skipSpaces(src, pos, max);

    if (isLetter(ch)) {
      const attrNameEnd = scanAttrName(src, pos, max);
      // There is no supported value-less attrs.
      if (
        attrNameEnd < max
                && src.charCodeAt(attrNameEnd) == CharCode.Equal
                && src.charCodeAt(attrNameEnd + 1) == CharCode.Quote
      ) {
        const attrName = src.substring(pos, attrNameEnd);
        const attrValueEnd = scanAttrValue(src, attrNameEnd + 2, max);
        const attrValue = src.substring(attrNameEnd + 2, attrValueEnd);
        attrs.push([attrName, attrValue]);
        // skip quote and go to next char.
        pos = attrValueEnd + 1;
      } else {
        return false;
      }
    }
    if (pos < max) {
      ch = src.charCodeAt(pos);
    } else {
      return false;
    }
  }

  if (!silent) {
    if ((ch === CharCode.Slash && !isClosingTag) || isSelfClosing(tagName)) {
      while (pos < max && ch !== CharCode.GreaterThan) {
        ++pos;
        if (pos < max) {
          ch = src.charCodeAt(pos);
        } else {
          return false;
        }
      }
      const token = state.push(tagName, 0);
      attrs.forEach(([attrName, attrValue]) => token.attrSet(attrName, attrValue));
    } else {
      const token = state.push(`${tagName}${isClosingTag ? '_close' : '_open'}`, 0);
      attrs.forEach(([attrName, attrValue]) => token.attrSet(attrName, attrValue));
    }
  }

  state.pos = ++pos;
  return true;
};

export default htmlTag;
