/* eslint-disable no-underscore-dangle */

class Token {
  type: string;

  attrs: (readonly [string, string])[] | undefined = undefined;

  children: Token[] | undefined = undefined;

  content: string | undefined;

  /**
     * '*' or '_' for em/strong, etc.
     * */
  markup = '';

  block = false;

  constructor(type: string) {
    this.type = type;
  }

  attrSet(name: string, value: string) {
    const idx = this._attrIndex(name);
    const attrData = [name, value] as const;

    if (idx < 0) {
      this._attrPush(attrData);
    } else {
      (this.attrs!)[idx] = attrData;
    }
  }

  attrGet(name: string) {
    const idx = this._attrIndex(name);
    let value;
    if (idx >= 0) {
      value = (this.attrs!)[idx][1];
    }
    return value;
  }

  _attrIndex(name: string) {
    if (!this.attrs) { return -1; }

    const attrs = this.attrs;

    for (let i = 0, len = attrs.length; i < len; i++) {
      if (attrs[i][0] === name) { return i; }
    }
    return -1;
  }

  _attrPush(attrData: readonly [string, string]) {
    if (this.attrs) {
      this.attrs.push(attrData);
    } else {
      this.attrs = [attrData];
    }
  }
}

export default Token;
