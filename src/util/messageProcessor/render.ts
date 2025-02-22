import type { ApiFormattedText, ApiMessageEntity } from '../../api/types';
import type Token from './Token';
import { ApiMessageEntityTypes } from '../../api/types';

import { CharCode } from './constants';

type State = {
  message: string;
  entities: ApiMessageEntity[];
  isLast: boolean;
};

type RenderFn = (token: Token, state: State) => void;

const renderers: Record<string, RenderFn> = {
  paragraph,
  link,
  em,
  strong,
  strikethrough,
  text,
  code,
  pre,
  emptyLines,
};

const htmlRenderers: Record<string, RenderFn> = {
  code: htmlCode,
  b: strong,
  strong,
  i: em,
  em,
  span,
  img,
  blockquote,
  strike: strikethrough,
  s: strikethrough,
  del: strikethrough,
  a: link,
  u: underline,
  br: breakLine,
};

function paragraph(token: Token, state: State): void {
  handleRender(token.children!, state);
  if (!state.isLast) {
    state.message += String.fromCharCode(CharCode.LineFeed);
  }
}

function emptyLines(token: Token, state: State): void {
  state.message += token.content;
}

function link(token: Token, state: State): void {
  const offset = state.message.length;
  handleRender(token.children!, state);
  const length = state.message.length - offset;
  state.entities.push({
    type: ApiMessageEntityTypes.TextUrl, offset, length, url: token.attrGet('href')!,
  });
}

function strong(token: Token, state: State): void {
  const offset = state.message.length;
  handleRender(token.children!, state);
  const length = state.message.length - offset;
  state.entities.push({ type: ApiMessageEntityTypes.Bold, offset, length });
}

function pre(token: Token, state: State): void {
  const offset = state.message.length;
  state.message += token.content;
  const length = state.message.length - offset;
  state.entities.push({
    type: ApiMessageEntityTypes.Pre, offset, length, language: token.attrGet('language'),
  });
}

function code(token: Token, state: State): void {
  const offset = state.message.length;
  state.message += token.content;
  const length = state.message.length - offset;
  state.entities.push({ type: ApiMessageEntityTypes.Code, offset, length });
}

function htmlCode(token: Token, state: State): void {
  const offset = state.message.length;
  handleRender(token.children!, state);
  const length = state.message.length - offset;
  state.entities.push({ type: ApiMessageEntityTypes.Code, offset, length });
}

function blockquote(token: Token, state: State): void {
  const offset = state.message.length;
  handleRender(token.children!, state);
  const length = state.message.length - offset;
  state.entities.push({ type: ApiMessageEntityTypes.Blockquote, offset, length });
}

function em(token: Token, state: State): void {
  const offset = state.message.length;
  handleRender(token.children!, state);
  const length = state.message.length - offset;
  state.entities.push({ type: ApiMessageEntityTypes.Italic, offset, length });
}

function underline(token: Token, state: State): void {
  const offset = state.message.length;
  handleRender(token.children!, state);
  const length = state.message.length - offset;
  state.entities.push({ type: ApiMessageEntityTypes.Underline, offset, length });
}

function strikethrough(token: Token, state: State): void {
  const offset = state.message.length;
  handleRender(token.children!, state);
  const length = state.message.length - offset;
  state.entities.push({ type: ApiMessageEntityTypes.Strike, offset, length });
}

function text(token: Token, state: State): void {
  state.message += token.content;
}

function span(token: Token, state: State): void {
  const offset = state.message.length;
  handleRender(token.children!, state);
  const length = state.message.length - offset;
  if (token.attrGet('data-entity-type') !== ApiMessageEntityTypes.Spoiler) {
    return;
  }
  state.entities.push({
    type: ApiMessageEntityTypes.Spoiler,
    offset,
    length,
  });
}

function img(token: Token, state: State): void {
  const offset = state.message.length;
  state.message += token.attrGet('alt');
  const length = state.message.length - offset;

  if (token.attrGet('data-entity-type') !== ApiMessageEntityTypes.CustomEmoji) {
    return;
  }

  state.entities.push({
    type: ApiMessageEntityTypes.CustomEmoji,
    offset,
    length,
    documentId: token.attrGet('data-document-id')!,
  });
}

function breakLine(_token: Token, state: State): void {
  state.message += '\n';
}

function html(token: Token, state: State): void {
  const htmlRenderer = htmlRenderers[token.type];
  htmlRenderer?.(token, state);
}

function handleRender(tree: Token[], state: State) {
  tree.forEach((token, index) => {
    state.isLast = index === tree.length - 1;
    const renderer = renderers[token.type] ?? html;
    renderer(token, state);
  });
}

const render = (tree: Token[]): ApiFormattedText => {
  const state: State = {
    message: '',
    entities: [],
    isLast: false,
  };
  handleRender(tree, state);

  return {
    text: state.message,
    entities: state.entities,
  };
};

export default render;
