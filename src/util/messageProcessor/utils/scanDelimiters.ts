import { CharCode } from '../constants';
import isMdAsciiPunctuation from './isMdAsciiPunctuation';
import isSpace from './isSpace';

export default function scanDelimiters(src: string, start: number, max: number, canSplitWord: boolean) {
  const marker = src.charCodeAt(start);

  // treat beginning of the line as a whitespace
  const lastChar = start > 0 ? src.charCodeAt(start - 1) : CharCode.Space;

  let pos = start;
  while (pos < max && src.charCodeAt(pos) === marker) {
    pos++;
  }

  const length = pos - start;

  // treat end of the line as a whitespace
  const nextChar = pos < max ? src.charCodeAt(pos) : CharCode.Space;

  const isLastPunctuationChar = isMdAsciiPunctuation(lastChar);
  const isNextPunctuationChar = isMdAsciiPunctuation(nextChar);

  const isLastWhiteSpace = isSpace(lastChar);
  const isNextWhiteSpace = isSpace(nextChar);

  const leftFlanking = !isNextWhiteSpace && (!isNextPunctuationChar || isLastWhiteSpace || isLastPunctuationChar);
  const rightFlanking = !isLastWhiteSpace && (!isLastPunctuationChar || isNextWhiteSpace || isNextPunctuationChar);

  const canOpen = leftFlanking && (canSplitWord || !rightFlanking || isLastPunctuationChar);
  const canClose = rightFlanking && (canSplitWord || !leftFlanking || isNextPunctuationChar);

  return { canOpen, canClose, length };
}
