import type BlockParser from './parsers/BlockParser';
import type InlineParser from './parsers/InlineParser';

export type ParserContext = {
  inline: InlineParser;
  block: BlockParser;
};
