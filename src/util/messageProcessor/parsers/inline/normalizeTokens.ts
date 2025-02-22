import type { InlineRuleFn } from '../types';

import Token from '../../Token';

const normalizeTokens: InlineRuleFn = (state) => {
  const processStack: { children:Token[]; tokenType: string; openToken: Token }[] = [];
  let children: Token[] = [];
  let tokenType: string = '';
  for (const token of state.tokens) {
    if (token.type === 'text' && !token.content) {
      // continue;
    } else if (token.type.endsWith('_open')) {
      processStack.push({ children, tokenType, openToken: token });
      children = [];
      tokenType = token.type.replace('_open', '');
    } else if (token.type.endsWith('_close')) {
      const closeTokenType = token.type.replace('_close', '');
      if (closeTokenType !== tokenType) {
        throw new Error(`Illegal state: closing of unopened token (${token.type})`);
      }
      const savedState = processStack.pop();
      const normalizedToken = new Token(closeTokenType);
      if (savedState) {
        savedState.openToken.attrs?.forEach(
          ([name, value]) => normalizedToken.attrSet(name, value),
        );
        normalizedToken.children = children;
        tokenType = savedState.tokenType;
        children = savedState.children;
        children.push(normalizedToken);
      }
    } else {
      children.push(token);
    }
  }
  if (processStack.length > 0) {
    throw new Error('Illegal state: open tokens left');
  }
  state.tokens.splice(0, state.tokens.length, ...children);
  return true;
};

export default normalizeTokens;
