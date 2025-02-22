import { CharCode } from '../constants';

function isSpace(code: number) {
  switch (code) {
    case CharCode.HorizontalTab:
    case CharCode.Space:
      return true;
  }
  return false;
}

export default isSpace;
