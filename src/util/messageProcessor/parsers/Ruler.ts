import type {
  BlockRuleFn, InlineRuleFn, Rule, RuleOptions,
} from './types';

/* eslint-disable no-underscore-dangle */

const DEFAULT_RULE_OPTIONS: RuleOptions = {
  alt: [],
};

class Ruler<TRuleFn extends InlineRuleFn | BlockRuleFn> {
  _rules: Rule<TRuleFn>[] = [];

  _cache: Record<string, TRuleFn[]> | undefined = undefined;

  push(ruleName: string, fn: TRuleFn, { alt }: RuleOptions = DEFAULT_RULE_OPTIONS) {
    this._rules.push({
      name: ruleName,
      fn,
      alt,
    });

    this._cache = undefined;
  }

  getRules(chainName: string) {
    if (!this._cache) {
      this._initCache();
    }
    return (this._cache!)[chainName] || [];
  }

  _find(name: string) {
    for (let i = 0; i < this._rules.length; i++) {
      if (this._rules[i].name === name) {
        return i;
      }
    }
    return -1;
  }

  _initCache() {
    const self = this;
    const chains = [''];

    // collect unique names
    self._rules.forEach((rule) => {
      rule.alt.forEach((altName) => {
        if (chains.indexOf(altName) < 0) {
          chains.push(altName);
        }
      });
    });

    self._cache = {};

    chains.forEach((chain: string) => {
      (self._cache!)[chain] = [];
      self._rules.forEach((rule) => {
        if (chain && rule.alt.indexOf(chain) < 0) { return; }

        (self._cache!)[chain].push(rule.fn);
      });
    });
  }
}

export default Ruler;
