import { CharCode } from '../constants';

export default function isMdAsciiPunctuation(code: number) {
  switch (code) {
    case CharCode.Exclamation:
    case CharCode.Quote:
    case CharCode.Sharp:
    case CharCode.Dollar:
    case CharCode.Percent:
    case CharCode.Ampersand:
    case CharCode.Apostrophe:
    case CharCode.LParenthesis:
    case CharCode.RParenthesis:
    case CharCode.Asterisk:
    case CharCode.Plus:
    case CharCode.Comma:
    case CharCode.Minus:
    case CharCode.Dot:
    case CharCode.Slash:
    case CharCode.Colon:
    case CharCode.Semicolon:
    case CharCode.LessThan:
    case CharCode.Equal:
    case CharCode.GreaterThan:
    case CharCode.Question:
    case CharCode.At:
    case CharCode.LSquareBracket:
    case CharCode.Backslash:
    case CharCode.RSquareBracket:
    case CharCode.Caret:
    case CharCode.Underscore:
    case CharCode.GraveAccent:
    case CharCode.LBracket:
    case CharCode.VerticalBar:
    case CharCode.RBracket:
    case CharCode.Tilde:
      return true;
    default:
      return false;
  }
}
