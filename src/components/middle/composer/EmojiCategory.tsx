import type { FC } from '../../../lib/teact/teact';
import React, { memo, useRef } from '../../../lib/teact/teact';

import type { ObserveFn } from '../../../hooks/useIntersectionObserver';

import { EMOJI_SIZE_PICKER, RECENT_SYMBOL_SET_ID } from '../../../config';
import buildClassName from '../../../util/buildClassName';
import windowSize from '../../../util/windowSize';
import { REM } from '../../common/helpers/mediaDimensions';

import useAppLayout from '../../../hooks/useAppLayout';
import { useOnIntersect } from '../../../hooks/useIntersectionObserver';
import useMediaTransitionDeprecated from '../../../hooks/useMediaTransitionDeprecated';
import useOldLang from '../../../hooks/useOldLang';

import EmojiButton from './EmojiButton';

const EMOJIS_PER_ROW_ON_DESKTOP = 8;
const EMOJI_MARGIN = 0.625 * REM;
const EMOJI_VERTICAL_MARGIN = 0.25 * REM;
const EMOJI_VERTICAL_MARGIN_MOBILE = 0.5 * REM;
const MOBILE_CONTAINER_PADDING = 0.5 * REM;

const CATEGORY_TO_INDEX: Record<string, number> = {
  recent: 0,
  people: 1,
  nature: 2,
  foods: 3,
  activity: 4,
  places: 5,
  objects: 6,
  symbols: 7,
  flags: 8,
};

type OwnProps = {
  id: string;
  selectedEmoji?: string;
  category: EmojiCategory;
  allEmojis: AllEmojis;
  observeIntersection: ObserveFn;
  shouldRender: boolean;
  onEmojiSelect: (emoji: string, name: string) => void;
};

const EmojiCategory: FC<OwnProps> = ({
  id, selectedEmoji, category, allEmojis, observeIntersection, shouldRender, onEmojiSelect,
}) => {
  // eslint-disable-next-line no-null/no-null
  const ref = useRef<HTMLDivElement>(null);

  useOnIntersect(ref, observeIntersection);

  const transitionClassNames = useMediaTransitionDeprecated(shouldRender);

  const lang = useOldLang();
  const { isMobile } = useAppLayout();

  const emojisPerRow = isMobile
    ? Math.floor(
      (windowSize.get().width - MOBILE_CONTAINER_PADDING + EMOJI_MARGIN) / (EMOJI_SIZE_PICKER + EMOJI_MARGIN),
    )
    : EMOJIS_PER_ROW_ON_DESKTOP;
  const height = Math.ceil(category.emojis.length / emojisPerRow)
    * (EMOJI_SIZE_PICKER + (isMobile ? EMOJI_VERTICAL_MARGIN_MOBILE : EMOJI_VERTICAL_MARGIN));

  return (
    <div
      ref={ref}
      key={category.id}
      id={id}
      className="symbol-set"
    >
      <div className="symbol-set-header">
        <p className="symbol-set-name" dir="auto">
          {lang(
            category.id === RECENT_SYMBOL_SET_ID ? 'RecentStickers' : `Emoji${CATEGORY_TO_INDEX[category.id] ?? 0}`,
          )}
        </p>
      </div>
      <div
        className={buildClassName('symbol-set-container', transitionClassNames)}
        style={`height: ${height}px;`}
        dir={lang.isRtl ? 'rtl' : undefined}
      >
        {shouldRender && category.emojis.map((name) => {
          const emoji = allEmojis[name];
          // Recent emojis may contain emoticons that are no longer in the list
          if (!emoji) {
            return undefined;
          }
          // Some emojis have multiple skins and are represented as an Object with emojis for all skins.
          // For now, we select only the first emoji with 'neutral' skin.
          const displayedEmoji = 'id' in emoji ? emoji : emoji[1];

          const isSelected = displayedEmoji.native === selectedEmoji;
          return (
            <EmojiButton
              key={displayedEmoji.id}
              isSelected={isSelected}
              emoji={displayedEmoji}
              onClick={onEmojiSelect}
            />
          );
        })}
      </div>
    </div>
  );
};

export default memo(EmojiCategory);
