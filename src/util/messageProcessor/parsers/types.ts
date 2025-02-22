import type BlockState from './BlockState';
import type InlineState from './InlineState';

export type BlockRuleFn = (state: BlockState, line: number, maxLine: number, silent?: boolean) => boolean;
export type InlineRuleFn = (state: InlineState, silent?: boolean) => boolean;

export type Rule<TRuleFn extends BlockRuleFn | InlineRuleFn> = {
  name: string;
  alt: string[];
  fn: TRuleFn;
};

export type RuleOptions = {
  alt: string[];
};
