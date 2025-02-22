import type { ParserContext } from '../types';

import { CharCode } from '../constants';
import isSpace from '../utils/isSpace';

import Token from '../Token';

class BlockState {
  bMarks: number[] = [];

  eMarks: number[] = [];

  tShift: number[] = [];

  sCount: number[] = [];

  bsCount: number[] = [];

  src: string;

  blkIndent = 0;

  // actual tokens
  tokens: Token[];

  line: number = 0;

  lineMax: number;

  parentType: string = '';

  md: ParserContext;

  constructor(input: string, context: ParserContext, tokens: Token[] = []) {
    this.src = input;
    this.md = context;
    this.tokens = tokens;

    let start = 0;
    let indent = 0;
    let offset = 0;
    let indentFound = false;
    const len = this.src.length;

    for (let pos = 0; pos < len; ++pos) {
      const ch = this.src.charCodeAt(pos);

      if (!indentFound) {
        switch (ch) {
          case CharCode.Space: {
            indent++;
            offset++;
            continue;
          }
          case CharCode.HorizontalTab: {
            indent++;
            offset += 4 - (offset % 4);
            continue;
          }
          default:
            indentFound = true;
        }
      }
      const isLastChar = pos === len - 1;
      if (isLastChar) {
        pos++;
      }
      if (ch === CharCode.LineFeed || isLastChar) {
        this.bMarks.push(start);
        this.eMarks.push(pos);
        this.tShift.push(indent);
        this.sCount.push(offset);
        this.bsCount.push(0);

        indentFound = false;
        indent = 0;
        offset = 0;
        start = pos + 1;
      }
    }

    // Push fake entry to simplify cache bounds checks
    this.bMarks.push(this.src.length);
    this.eMarks.push(this.src.length);
    this.tShift.push(0);
    this.sCount.push(0);
    this.bsCount.push(0);

    this.lineMax = this.bMarks.length - 1; // don't count last fake line
  }

  push(type: string) {
    const token = new Token(type);
    token.block = true;

    this.tokens.push(token);
    return token;
  }

  isEmpty(line: number) {
    return this.bMarks[line] + this.tShift[line] >= this.eMarks[line];
  }

  // Skip spaces from given position.
  skipSpaces(pos: number) {
    for (let max = this.src.length; pos < max; pos++) {
      const ch = this.src.charCodeAt(pos);
      if (!isSpace(ch)) { break; }
    }
    return pos;
  }

  // Skip char codes from given position
  skipChars(pos: number, code: number) {
    for (let max = this.src.length; pos < max; pos++) {
      if (this.src.charCodeAt(pos) !== code) { break; }
    }
    return pos;
  }

  // cut lines range from source.
  getLines(begin: number, end: number, indent: number, keepLastLF: boolean) {
    if (begin >= end) {
      return '';
    }

    const queue = new Array(end - begin);

    for (let i = 0, line = begin; line < end; line++, i++) {
      let lineIndent = 0;
      const lineStart = this.bMarks[line];
      let first = lineStart;
      let last;

      if (line + 1 < end || keepLastLF) {
        // No need for bounds check because we have fake entry on tail.
        last = this.eMarks[line] + 1;
      } else {
        last = this.eMarks[line];
      }

      while (first < last && lineIndent < indent) {
        const ch = this.src.charCodeAt(first);

        if (isSpace(ch)) {
          if (ch === CharCode.HorizontalTab) {
            lineIndent += 4 - ((lineIndent + this.bsCount[line]) % 4);
          } else {
            lineIndent++;
          }
        } else if (first - lineStart < this.tShift[line]) {
          // patched tShift masked characters to look like spaces (blockquotes, list markers)
          lineIndent++;
        } else {
          break;
        }

        first++;
      }

      if (lineIndent > indent) {
        // partially expanding tabs in code blocks, e.g '\t\tfoobar'
        // with indent=2 becomes '  \tfoobar'
        queue[i] = new Array(lineIndent - indent + 1).join(' ') + this.src.slice(first, last);
      } else {
        queue[i] = this.src.slice(first, last);
      }
    }

    return queue.join('');
  }
}

export default BlockState;
