import { CharCode } from '../constants';

function isTerminatorChar(ch: number) {
  switch (ch) {
    case CharCode.LineFeed:
    case CharCode.Exclamation:
    case CharCode.Sharp:
    case CharCode.Dollar:
    case CharCode.Percent:
    case CharCode.Ampersand:
    case CharCode.Asterisk:
    case CharCode.Plus:
    case CharCode.Minus:
    case CharCode.Colon:
    case CharCode.LessThan:
    case CharCode.Equal:
    case CharCode.GreaterThan:
    case CharCode.At:
    case CharCode.LSquareBracket:
    case CharCode.Backslash:
    case CharCode.RSquareBracket:
    case CharCode.Caret:
    case CharCode.Underscore:
    case CharCode.GraveAccent:
    case CharCode.LBracket:
    case CharCode.RBracket:
    case CharCode.Tilde:
      return true;
    default:
      return false;
  }
}

export default isTerminatorChar;
