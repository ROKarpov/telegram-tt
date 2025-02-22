import type Token from './Token';
import type { ParserContext } from './types';

import BlockParser, { BlockParserRules } from './parsers/BlockParser';
import InlineParser, { InlineParserRules } from './parsers/InlineParser';

const context: ParserContext = {
  inline: new InlineParser(),
  block: new BlockParser(),
};

const noMdContext = {
  inline: new InlineParser([InlineParserRules.HtmlTag]),
  block: new BlockParser([BlockParserRules.EmptyLines, BlockParserRules.Paragraph]),
};

const noMdLinksContext = {
  inline: new InlineParser([
    InlineParserRules.Text,
    InlineParserRules.Emphasis,
    InlineParserRules.Strikethrough,
    InlineParserRules.InlineCode,
    InlineParserRules.HtmlTag,
  ]),
  block: new BlockParser([BlockParserRules.EmptyLines, BlockParserRules.Paragraph]),
};

type Options = {
  withMarkdownLinks?: boolean;
  skipMarkdown?: boolean;
};

function pickContext({ withMarkdownLinks, skipMarkdown }: Options = {}) {
  if (skipMarkdown) {
    return noMdContext;
  }
  if (withMarkdownLinks) {
    return context;
  }
  return noMdLinksContext;
}

const parse = (src: string, options?: Options) => {
  const tokens: Token[] = [];
  context.block.parse(src, pickContext(options), tokens);
  return tokens;
};

export default parse;
