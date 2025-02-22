import type { FC } from '../../../lib/teact/teact';
import React, {
  memo, useEffect,
  useRef, useState,
} from '../../../lib/teact/teact';
import { withGlobal } from '../../../global';

import type { GlobalState } from '../../../global/types';
import type { IconName } from '../../../types/icons';

import { MENU_TRANSITION_DURATION } from '../../../config';
import animateHorizontalScroll from '../../../util/animateHorizontalScroll';
import animateScroll from '../../../util/animateScroll';
import buildClassName from '../../../util/buildClassName';
import { pick } from '../../../util/iteratees';
import { IS_TOUCH_ENV } from '../../../util/windowEnvironment';
import { REM } from '../../common/helpers/mediaDimensions';

import { type EmojiCategoryData, useEmojiData } from '../../../hooks/shared/useEmojiData';
import useAppLayout from '../../../hooks/useAppLayout';
import useHorizontalScroll from '../../../hooks/useHorizontalScroll';
import { useIntersectionObserver } from '../../../hooks/useIntersectionObserver';
import useLastCallback from '../../../hooks/useLastCallback';
import useOldLang from '../../../hooks/useOldLang';
import useScrolledState from '../../../hooks/useScrolledState';
import useAsyncRendering from '../../right/hooks/useAsyncRendering';

import Icon from '../../common/icons/Icon';
import Button from '../../ui/Button';
import Loading from '../../ui/Loading';
import EmojiCategory from './EmojiCategory';

import './EmojiPicker.scss';

type OwnProps = {
  className?: string;
  hideRecent?: boolean;
  customCategories?: EmojiCategoryData[];
  onEmojiSelect: (emoji: string, name: string) => void;
};

type StateProps = Pick<GlobalState, 'recentEmojis'>;

const ID_PREFIX = 'emoji-category-';

const ICONS_BY_CATEGORY: Record<string, IconName> = {
  recent: 'recent',
  people: 'smile',
  nature: 'animals',
  foods: 'eats',
  activity: 'sport',
  places: 'car',
  objects: 'lamp',
  symbols: 'language',
  flags: 'flag',
};

const SMOOTH_SCROLL_DISTANCE = 100;
const FOCUS_MARGIN = 3.25 * REM;
const HEADER_BUTTON_WIDTH = 2.625 * REM; // Includes margins
const INTERSECTION_THROTTLE = 200;

const categoryIntersections: boolean[] = [];

const EmojiPicker: FC<OwnProps & StateProps> = ({
  className,
  recentEmojis,
  hideRecent,
  onEmojiSelect,
}) => {
  const { emojis, allCategories } = useEmojiData({ recentEmojis, hideRecent });

  // eslint-disable-next-line no-null/no-null
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line no-null/no-null
  const headerRef = useRef<HTMLDivElement>(null);

  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const { isMobile } = useAppLayout();
  const {
    handleScroll: handleContentScroll,
    isAtBeginning: shouldHideTopBorder,
  } = useScrolledState();

  const { observe: observeIntersection } = useIntersectionObserver({
    rootRef: containerRef,
    throttleMs: INTERSECTION_THROTTLE,
  }, (entries) => {
    entries.forEach((entry) => {
      const { id } = entry.target as HTMLDivElement;
      if (!id || !id.startsWith(ID_PREFIX)) {
        return;
      }

      const index = Number(id.replace(ID_PREFIX, ''));
      categoryIntersections[index] = entry.isIntersecting;
    });

    const minIntersectingIndex = categoryIntersections.reduce((lowestIndex, isIntersecting, index) => {
      return isIntersecting && index < lowestIndex ? index : lowestIndex;
    }, Infinity);

    if (minIntersectingIndex === Infinity) {
      return;
    }

    setActiveCategoryIndex(minIntersectingIndex);
  });

  const canRenderContents = useAsyncRendering([], MENU_TRANSITION_DURATION);
  const shouldRenderContent = emojis && canRenderContents;

  useHorizontalScroll(headerRef, !(isMobile && shouldRenderContent));

  // Scroll header when active set updates
  useEffect(() => {
    if (!allCategories.length) {
      return;
    }

    const header = headerRef.current;
    if (!header) {
      return;
    }

    const newLeft = activeCategoryIndex * HEADER_BUTTON_WIDTH - header.offsetWidth / 2 + HEADER_BUTTON_WIDTH / 2;

    animateHorizontalScroll(header, newLeft);
  }, [allCategories, activeCategoryIndex]);

  const lang = useOldLang();

  const selectCategory = useLastCallback((index: number) => {
    setActiveCategoryIndex(index);
    const categoryEl = containerRef.current!.closest<HTMLElement>('.SymbolMenu-main')!
      .querySelector(`#${ID_PREFIX}${index}`)! as HTMLElement;
    animateScroll({
      container: containerRef.current!,
      element: categoryEl,
      position: 'start',
      margin: FOCUS_MARGIN,
      maxDistance: SMOOTH_SCROLL_DISTANCE,
    });
  });

  function renderCategoryButton(category: EmojiCategoryData, index: number) {
    const icon = ICONS_BY_CATEGORY[category.id];

    return icon && (
      <Button
        className={`symbol-set-button ${index === activeCategoryIndex ? 'activated' : ''}`}
        round
        faded
        color="translucent"
        // eslint-disable-next-line react/jsx-no-bind
        onClick={() => selectCategory(index)}
        ariaLabel={category.name}
      >
        <Icon name={icon} />
      </Button>
    );
  }

  const containerClassName = buildClassName('EmojiPicker', className);

  if (!shouldRenderContent) {
    return (
      <div className={containerClassName}>
        <Loading />
      </div>
    );
  }

  const headerClassName = buildClassName(
    'EmojiPicker-header',
    !shouldHideTopBorder && 'with-top-border',
  );

  return (
    <div className={containerClassName}>
      <div
        ref={headerRef}
        className={headerClassName}
        dir={lang.isRtl ? 'rtl' : undefined}
      >
        {allCategories.map(renderCategoryButton)}
      </div>
      <div
        ref={containerRef}
        onScroll={handleContentScroll}
        className={buildClassName('EmojiPicker-main', IS_TOUCH_ENV ? 'no-scrollbar' : 'custom-scroll')}
      >
        {allCategories.map((category, i) => (
          <EmojiCategory
            category={category}
            id={`${ID_PREFIX}${i}`}
            allEmojis={emojis}
            observeIntersection={observeIntersection}
            shouldRender={activeCategoryIndex >= i - 1 && activeCategoryIndex <= i + 1}
            onEmojiSelect={onEmojiSelect}
          />
        ))}
      </div>
    </div>
  );
};

export default memo(withGlobal<OwnProps>(
  (global): StateProps => pick(global, ['recentEmojis']),
)(EmojiPicker));
