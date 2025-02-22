import type { BlockRuleFn } from '../types';

// Paragraph
const paragraph: BlockRuleFn = (state, startLine, endLine) => {
  const terminatorRules = state.md.block.ruler.getRules('paragraph');
  const oldParentType = state.parentType;
  state.parentType = 'paragraph';

  // jump line-by-line until empty one or EOF
  let nextLine = startLine + 1;
  for (; nextLine < endLine && !state.isEmpty(nextLine); nextLine++) {
    // this would be a code block normally, but after paragraph
    // it's considered a lazy continuation regardless of what's there
    if (state.sCount[nextLine] - state.blkIndent > 3) { continue; }

    // quirk for blockquotes, this line should already be checked by that rule
    if (state.sCount[nextLine] < 0) { continue; }

    // Some tags can terminate paragraph without empty line.
    let terminate = false;
    for (let i = 0, l = terminatorRules.length; i < l; i++) {
      if (terminatorRules[i](state, nextLine, endLine, true)) {
        terminate = true;
        break;
      }
    }
    if (terminate) { break; }
  }

  const content = state.getLines(startLine, nextLine, state.blkIndent, false);

  const token = state.push('paragraph');
  token.children = [];
  state.md.inline.parse(content, state.md, token.children);

  state.line = nextLine;
  state.parentType = oldParentType;

  return true;
};

export default paragraph;
