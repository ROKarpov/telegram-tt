import type { BlockRuleFn } from '../types';

const emptyLines: BlockRuleFn = (state, startLine, maxLine) => {
  if (!state.isEmpty(startLine)) {
    return false;
  }

  let line = startLine;
  while (line < maxLine && state.isEmpty(line)) {
    ++line;
  }

  const token = state.push('emptyLines');
  token.content = state.getLines(startLine, line, 0, true);

  state.line = line;
  return true;
};

export default emptyLines;
