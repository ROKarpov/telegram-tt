import type Token from '../Token';
import type { ParserContext } from '../types';
import type { InlineRuleFn } from './types';

import code from './inline/code';
import connectDelimiters from './inline/connectDelimiters';
import emphasis from './inline/emphasis';
import htmlTag from './inline/htmlTag';
import link from './inline/link';
import normalizeTokens from './inline/normalizeTokens';
import strikethrough from './inline/strikethrough';
import text from './inline/text';

import InlineState from './InlineState';
import Ruler from './Ruler';

export enum InlineParserRules {
  Text = 'text',
  Link = 'link',
  Emphasis = 'emphasis',
  Strikethrough = 'strikethrough',
  InlineCode = 'inlineCode',
  HtmlTag = 'htmlTag',
}

const ALL_RULES: InlineParserRules[] = Object.values(InlineParserRules);

class InlineParser {
  ruler: Ruler<InlineRuleFn> = new Ruler();

  postProcessRuler: Ruler<InlineRuleFn> = new Ruler();

  constructor(enabledRules: InlineParserRules[] = ALL_RULES) {
    if (enabledRules.includes(InlineParserRules.Text)) {
      this.ruler.push(InlineParserRules.Text, text);
    }
    if (enabledRules.includes(InlineParserRules.Link)) {
      this.ruler.push(InlineParserRules.Link, link);
    }
    if (enabledRules.includes(InlineParserRules.Emphasis)) {
      this.ruler.push(InlineParserRules.Emphasis, emphasis.tokenize);
    }
    if (enabledRules.includes(InlineParserRules.Strikethrough)) {
      this.ruler.push(InlineParserRules.Strikethrough, strikethrough.tokenize);
    }
    if (enabledRules.includes(InlineParserRules.InlineCode)) {
      this.ruler.push(InlineParserRules.InlineCode, code);
    }
    if (enabledRules.includes(InlineParserRules.HtmlTag)) {
      this.ruler.push(InlineParserRules.HtmlTag, htmlTag);
    }

    if (enabledRules.includes(InlineParserRules.Emphasis)
      || enabledRules.includes(InlineParserRules.Strikethrough)
    ) {
      this.postProcessRuler.push('linkDelimiters', connectDelimiters);
    }
    if (enabledRules.includes(InlineParserRules.Emphasis)) {
      this.postProcessRuler.push(InlineParserRules.Emphasis, emphasis.postProcess);
    }
    if (enabledRules.includes(InlineParserRules.Strikethrough)) {
      this.postProcessRuler.push(InlineParserRules.Strikethrough, strikethrough.postProcess);
    }
    this.postProcessRuler.push('normalizeTokens', normalizeTokens);
  }

  skipToken(state: InlineState) {
    const pos = state.pos;
    const rules = this.ruler.getRules('');
    const len = rules.length;
    const cache = state.cache;

    if (typeof cache[pos] !== 'undefined') {
      state.pos = cache[pos];
      return;
    }

    let ok = false;

    for (let i = 0; i < len; i++) {
      // Increment state.level and decrement it later to limit recursion.
      // It's harmless to do here, because no tokens are created. But ideally,
      // we'd need a separate private state variable for this purpose.
      //
      ok = rules[i](state, true);
      if (ok) {
        if (pos >= state.pos) { throw new Error("inline rule didn't increment state.pos"); }
        break;
      }
    }

    if (!ok) { state.pos++; }
    cache[pos] = state.pos;
  }

  tokenize(state: InlineState) {
    const rules = this.ruler.getRules('');
    const len = rules.length;
    const end = state.posMax;

    while (state.pos < end) {
      const prevPos = state.pos;
      let ok = false;
      for (let i = 0; i < len; i++) {
        ok = rules[i](state);
        if (ok) {
          if (prevPos >= state.pos) { throw new Error("inline rule didn't increment state.pos"); }
          break;
        }
      }
      if (ok) {
        if (state.pos >= end) { break; }
        continue;
      }
      state.pending += state.src[state.pos++];
    }

    if (state.pending) {
      state.pushPending();
    }
  }

  parse(str: string, md: ParserContext, outTokens: Token[]) {
    const state = new InlineState(str, md, outTokens);

    this.tokenize(state);

    const postProcessRules = this.postProcessRuler.getRules('');
    const postProcessLen = postProcessRules.length;
    for (let i = 0; i < postProcessLen; i++) {
      postProcessRules[i](state);
    }
  }
}

export default InlineParser;
