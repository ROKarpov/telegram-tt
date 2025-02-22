// Inline parser state

import type { ParserContext } from '../types';

import { CharCode } from '../constants';
import isMdAsciiPunctuation from '../utils/isMdAsciiPunctuation';
import isSpace from '../utils/isSpace';

import Token from '../Token';

export interface IInlineState {

}

export type Delimiter = {
  // Char code of the starting marker (number).
  //
  marker: number;

  // Total length of these series of delimiters.
  //
  length: number;

  // A position of the token this delimiter corresponds to.
  //
  token: number;

  // If this delimiter is matched as a valid opener, `end` will be
  // equal to its position, otherwise it's `-1`.
  //
  end: number;

  // Boolean flags that determine if this delimiter could open or close
  // an emphasis.
  //
  open: boolean;
  close: boolean;
};

type TokenMeta = { delimiters: Delimiter[] };

class InlineState implements IInlineState {
  src: string;

  md: ParserContext;

  tokens: Token[];

  tokensMeta: (TokenMeta | undefined)[] = [];

  pos;

  posMax;

  pending = '';

  // Stores { start: end } pairs. Useful for backtrack
  // optimization of pairs parse (emphasis, strikes).
  cache: Record<number, number> = {};

  // List of emphasis-like delimiters for current tag
  delimiters: Delimiter[] = [];

  // Stack of delimiter lists for upper level tags
  #delimitersStack: Delimiter[][] = [];

  // backtick length => last seen position
  backticks: Record<number, number> = {};

  backticksScanned = false;

  // Counter used to disable inline linkify-it execution
  // inside <a> and Markdown links
  linkLevel = 0;

  constructor(src: string, md: ParserContext, outTokens: Token[]) {
    this.src = src;
    this.md = md;
    this.tokens = outTokens;
    this.tokensMeta = Array(outTokens.length);

    this.pos = 0;
    this.posMax = this.src.length;
  }

  // Flush pending text
  //
  pushPending() {
    const token = new Token('text');
    token.content = this.pending;
    this.tokens.push(token);
    this.pending = '';
    return token;
  }

  // Push new token to "stream".
  // If pending text exists - flush it as text token
  //
  push(type: string, nesting: number) {
    if (this.pending) {
      this.pushPending();
    }

    const token = new Token(type);
    let tokenMeta: TokenMeta | undefined;

    if (nesting < 0) {
      // closing tag
      this.delimiters = this.#delimitersStack.pop() ?? [];
    }

    if (nesting > 0) {
      // opening tag
      this.#delimitersStack.push(this.delimiters);
      this.delimiters = [];
      tokenMeta = { delimiters: this.delimiters };
    }

    this.tokens.push(token);
    this.tokensMeta.push(tokenMeta);
    return token;
  }
}

export default InlineState;
