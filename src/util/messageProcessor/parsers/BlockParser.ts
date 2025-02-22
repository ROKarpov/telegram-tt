import type Token from '../Token';
import type { ParserContext } from '../types';
import type { BlockRuleFn } from './types';

import emptyLines from './block/emptyLines';
import paragraph from './block/paragraph';
import pre from './block/pre';

import BlockState from './BlockState';
import Ruler from './Ruler';

export enum BlockParserRules {
  EmptyLines = 'emptyLines',
  Pre = 'pre',
  Paragraph = 'paragraph',
}

const ALL_RULES = Object.values(BlockParserRules);

class BlockParser {
  ruler: Ruler<BlockRuleFn> = new Ruler();

  constructor(enabledRules: BlockParserRules[] = ALL_RULES) {
    if (enabledRules.includes(BlockParserRules.EmptyLines)) {
      this.ruler.push(BlockParserRules.EmptyLines, emptyLines);
    }
    if (enabledRules.includes(BlockParserRules.Pre)) {
      this.ruler.push(BlockParserRules.Pre, pre, { alt: ['paragraph'] });
    }
    if (enabledRules.includes(BlockParserRules.Paragraph)) {
      this.ruler.push(BlockParserRules.Paragraph, paragraph);
    }
  }

  parse(src: string, md: ParserContext, outTokens: Token[]) {
    if (!src) { return; }

    const state = new BlockState(src, md, outTokens);

    // eslint-disable-next-line no-underscore-dangle
    this._tokenize(state, state.line, state.lineMax);
  }

  // Generate tokens for input range
  // eslint-disable-next-line no-underscore-dangle
  _tokenize(state: BlockState, startLine: number, endLine: number) {
    const rules = this.ruler.getRules('');
    const len = rules.length;
    let line = startLine;

    while (line < endLine) {
      if (state.sCount[line] < state.blkIndent) { break; }

      const prevLine = state.line;
      let ok = false;

      for (let i = 0; i < len; i++) {
        ok = rules[i](state, line, endLine);
        if (ok) {
          if (prevLine >= state.line) {
            throw new Error("block rule didn't increment state.line");
          }
          break;
        }
      }

      if (!ok) throw new Error('none of the block parsers matched');

      line = state.line;
    }
  }
}

export default BlockParser;
