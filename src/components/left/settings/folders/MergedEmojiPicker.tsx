import type { FC, TeactNode } from '../../../../lib/teact/teact';
import React, {
  memo, useCallback, useEffect, useMemo, useRef,
  useState,
} from '../../../../lib/teact/teact';
import { getGlobal, withGlobal } from '../../../../global';

import type { ApiSticker, ApiStickerSet } from '../../../../api/types';
import type { StickerSetOrReactionsSetOrRecent } from '../../../../types';

import {
  FAVORITE_SYMBOL_SET_ID,
  POPULAR_SYMBOL_SET_ID,
  RECENT_SYMBOL_SET_ID,
  SLIDE_TRANSITION_DURATION,
  STICKER_PICKER_MAX_SHARED_COVERS,
  STICKER_SIZE_PICKER_HEADER,
  TOP_SYMBOL_SET_ID,
} from '../../../../config';
import {
  selectCanPlayAnimatedEmojis,
  selectIsAlwaysHighPriorityEmoji,
  selectIsCurrentUserPremium,
} from '../../../../global/selectors';
import animateHorizontalScroll from '../../../../util/animateHorizontalScroll';
import buildClassName from '../../../../util/buildClassName';
import { IS_TOUCH_ENV } from '../../../../util/windowEnvironment';
import { REM } from '../../../common/helpers/mediaDimensions';

import { useCustomEmojiData } from '../../../../hooks/shared/useCustomEmojiData';
import { useEmojiData } from '../../../../hooks/shared/useEmojiData';
import useAppLayout from '../../../../hooks/useAppLayout';
import useHorizontalScroll from '../../../../hooks/useHorizontalScroll';
import useLastCallback from '../../../../hooks/useLastCallback';
import useOldLang from '../../../../hooks/useOldLang';
import usePrevDuringAnimation from '../../../../hooks/usePrevDuringAnimation';
import useScrolledState from '../../../../hooks/useScrolledState';
import { useStickerPickerObservers } from '../../../common/hooks/useStickerPickerObservers';
import useAsyncRendering from '../../../right/hooks/useAsyncRendering';

import Icon from '../../../common/icons/Icon';
import StickerButton from '../../../common/StickerButton';
import StickerSet from '../../../common/StickerSet';
import EmojiCategory from '../../../middle/composer/EmojiCategory';
import StickerSetCover from '../../../middle/composer/StickerSetCover';
import Button from '../../../ui/Button';
import InputText from '../../../ui/InputText';
import Loading from '../../../ui/Loading';

import './MergedEmojiPicker.scss';
import pickerStyles from '../../../middle/composer/StickerPicker.module.scss';

type OwnProps = {
  className?: string;
  pickerListClassName?: string;
  isHidden?: boolean;
  loadAndPlay: boolean;
  idPrefix?: string;
  withDefaultTopicIcons?: boolean;
  selectedEmojiId?: string;
  selectedReactionIds?: string[];
  isFolderEmojiPicker?: boolean;
  isTranslucent?: boolean;
  children?: TeactNode;
  onEmojiSelect: (id: string, name: string) => void;
  onCustomEmojiSelect: (sticker: ApiSticker) => void;
  onContextMenuOpen?: NoneToVoidFunction;
  onContextMenuClose?: NoneToVoidFunction;
  onContextMenuClick?: NoneToVoidFunction;
};

type StateProps = {
  customEmojisById?: Record<string, ApiSticker>;
  stickerSetsById: Record<string, ApiStickerSet>;
  addedCustomEmojiIds?: string[];
  customEmojiFeaturedIds?: string[];
  canAnimate?: boolean;
  isCurrentUserPremium?: boolean;
};

const HEADER_BUTTON_WIDTH = 2.5 * REM; // px (including margin)

const DEFAULT_ID_PREFIX = 'custom-emoji-set';
const FADED_BUTTON_SET_IDS = new Set([RECENT_SYMBOL_SET_ID, FAVORITE_SYMBOL_SET_ID, POPULAR_SYMBOL_SET_ID]);
const STICKER_SET_IDS_WITH_COVER = new Set([
  RECENT_SYMBOL_SET_ID,
  FAVORITE_SYMBOL_SET_ID,
  POPULAR_SYMBOL_SET_ID,
]);

const MergedEmojiPicker: FC<OwnProps & StateProps> = ({
  className,
  pickerListClassName,
  isHidden,
  loadAndPlay,
  addedCustomEmojiIds,
  customEmojisById,
  selectedEmojiId,
  selectedReactionIds,
  stickerSetsById,
  idPrefix = DEFAULT_ID_PREFIX,
  customEmojiFeaturedIds,
  canAnimate,
  isFolderEmojiPicker,
  isTranslucent,
  isCurrentUserPremium,
  withDefaultTopicIcons,
  children,
  onEmojiSelect,
  onCustomEmojiSelect,
  onContextMenuOpen,
  onContextMenuClose,
  onContextMenuClick,
}) => {
  // eslint-disable-next-line no-null/no-null
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line no-null/no-null
  const headerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line no-null/no-null
  const sharedCanvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line no-null/no-null
  const sharedCanvasHqRef = useRef<HTMLCanvasElement>(null);

  const [search, setSearch] = useState('');
  const { isMobile } = useAppLayout();
  const {
    handleScroll: handleContentScroll,
    isAtBeginning: shouldHideTopBorder,
  } = useScrolledState();

  const prefix = `${idPrefix}-custom-emoji`;
  const {
    activeSetIndex,
    observeIntersectionForSet,
    observeIntersectionForPlayingItems,
    observeIntersectionForShowingItems,
    observeIntersectionForCovers,
    selectStickerSet,
  } = useStickerPickerObservers(containerRef, headerRef, prefix, isHidden);

  const canLoadAndPlay = usePrevDuringAnimation(loadAndPlay || undefined, SLIDE_TRANSITION_DURATION);

  const lang = useOldLang();

  const { emojis, allCategories, nativeToName } = useEmojiData({ hideRecent: true });

  const filteredCategories = useMemo(() => {
    if (!allCategories || !allCategories.length || !search) {
      return allCategories;
    }
    return allCategories
      .map((category) => ({
        ...category,
        emojis: category.emojis.filter((emoji) => emoji.includes(search)),
      }))
      .filter((category) => category.emojis.length > 0);
  }, [allCategories, search]);

  const {
    allSets,
    areAddedLoaded,
    noPopulatedSets,
  } = useCustomEmojiData({
    addedCustomEmojiIds,
    customEmojisById,
    stickerSetsById,
    customEmojiFeaturedIds,
    withDefaultTopicIcons,
    hideRecent: true,
  });

  const filteredSets = useMemo(() => {
    if (!allSets || allSets.length === 0 || !nativeToName || !search) {
      return allSets;
    }
    return allSets
      .map((set) => {
        const stickers = set.stickers?.filter(
          (sticker) => sticker.emoji && nativeToName[sticker.emoji]?.includes(search),
        );
        return ({
          ...set,
          //
          stickers,
          count: stickers?.length ?? 0,
        });
      })
      .filter((set) => set.stickers && set.stickers?.length > 0);
  }, [allSets, nativeToName, search]);

  const canRenderContent = useAsyncRendering([], SLIDE_TRANSITION_DURATION);
  const shouldRenderContent = emojis && areAddedLoaded && canRenderContent && !noPopulatedSets;

  useHorizontalScroll(headerRef, isMobile || !shouldRenderContent);

  // Scroll container and header when active set changes
  useEffect(() => {
    if (!areAddedLoaded) {
      return;
    }

    const header = headerRef.current;
    if (!header) {
      return;
    }

    const headerIndex = Math.max(0, activeSetIndex - filteredCategories.length + 1);
    const newLeft = headerIndex * HEADER_BUTTON_WIDTH - (header.offsetWidth / 2 - HEADER_BUTTON_WIDTH / 2);

    animateHorizontalScroll(header, newLeft);
  }, [areAddedLoaded, activeSetIndex, filteredCategories.length]);

  const handleEmojiSelect = useLastCallback((emoji: ApiSticker) => {
    onCustomEmojiSelect(emoji);
  });

  const handleSearchChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => setSearch(e.target.value),
    [],
  );

  const handleSearchClear = useCallback(
    () => setSearch(''),
    [],
  );

  function renderCoverForCustom(stickerSet: StickerSetOrReactionsSetOrRecent, index: number) {
    const firstSticker = stickerSet.stickers?.[0];
    const customSetIndex = Math.max(0, activeSetIndex - filteredCategories.length + 1);
    const headerIndex = index + 1;

    const buttonClassName = buildClassName(
      pickerStyles.stickerCover,
      headerIndex === customSetIndex && 'cover-activated',
    );

    const withSharedCanvas = index < STICKER_PICKER_MAX_SHARED_COVERS;
    const isHq = selectIsAlwaysHighPriorityEmoji(getGlobal(), stickerSet as ApiStickerSet);

    if (stickerSet.id === TOP_SYMBOL_SET_ID) {
      return undefined;
    }

    if (STICKER_SET_IDS_WITH_COVER.has(stickerSet.id) || stickerSet.hasThumbnail || !firstSticker) {
      const isFaded = FADED_BUTTON_SET_IDS.has(stickerSet.id);
      return (
        <Button
          key={stickerSet.id}
          className={buttonClassName}
          ariaLabel={stickerSet.title}
          round
          faded={isFaded}
          color="translucent"
          // eslint-disable-next-line react/jsx-no-bind
          onClick={() => selectStickerSet(index + filteredCategories.length)}
        >
          <StickerSetCover
            stickerSet={stickerSet as ApiStickerSet}
            noPlay={!canAnimate || !canLoadAndPlay}
            forcePlayback
            observeIntersection={observeIntersectionForCovers}
            sharedCanvasRef={withSharedCanvas ? (isHq ? sharedCanvasHqRef : sharedCanvasRef) : undefined}
          />
        </Button>
      );
    }

    return (
      <StickerButton
        key={stickerSet.id}
        sticker={firstSticker}
        size={STICKER_SIZE_PICKER_HEADER}
        title={stickerSet.title}
        className={buttonClassName}
        noPlay={!canAnimate || !canLoadAndPlay}
        observeIntersection={observeIntersectionForCovers}
        noContextMenu
        isCurrentUserPremium
        sharedCanvasRef={withSharedCanvas ? (isHq ? sharedCanvasHqRef : sharedCanvasRef) : undefined}
        withTranslucentThumb={isTranslucent}
        onClick={selectStickerSet}
        clickArg={index + filteredCategories.length}
        forcePlayback
      />
    );
  }

  const fullClassName = buildClassName('MergedEmojiPicker', 'MergedEmojiPicker_root', className, isMobile && 'mobile');

  if (!shouldRenderContent) {
    return (
      <div className={fullClassName}>
        {noPopulatedSets && !emojis ? (
          <div className={pickerStyles.pickerDisabled}>{lang('NoStickers')}</div>
        ) : (
          <Loading />
        )}
      </div>
    );
  }

  const headerClassName = buildClassName(
    'MergedEmojiPicker_header',
    pickerStyles.header,
    'no-scrollbar',
    !shouldHideTopBorder && pickerStyles.headerWithBorder,
  );
  const listClassName = buildClassName(
    pickerStyles.main,
    pickerStyles.main_customEmoji,
    IS_TOUCH_ENV ? 'no-scrollbar' : 'custom-scroll',
    pickerListClassName,
    'has-header',
  );

  return (
    <div className={fullClassName}>
      <div
        ref={headerRef}
        className={headerClassName}
      >
        <div className="shared-canvas-container">
          <canvas ref={sharedCanvasRef} className="shared-canvas" />
          <canvas ref={sharedCanvasHqRef} className="shared-canvas" />

          <Button
            key="emojis-cover"
            className={buildClassName(
              pickerStyles.stickerCover,
              activeSetIndex === 0 && 'cover-activated',
            )}
            ariaLabel="emojis"
            round
            color="translucent"
            // eslint-disable-next-line react/jsx-no-bind
            onClick={() => selectStickerSet(0)}
            faded
          >
            <Icon name="smile" />
          </Button>
          {filteredSets.map(renderCoverForCustom)}
        </div>

        <InputText
          className="search"
          startAdornment={<Icon className="search-icon" name="search" />}
          placeholder={lang('Search')}
          value={search}
          onChange={handleSearchChange}
          endAdornment={search && (
            <Button
              className="search-clear"
              size="tiny"
              color="translucent"
              onClick={handleSearchClear}
            >
              <Icon name="close" />
            </Button>
          )}
        />
      </div>

      <div
        ref={containerRef}
        onScroll={handleContentScroll}
        className={listClassName}
      >
        {children}
        {emojis && filteredCategories.map((category, i) => (
          <EmojiCategory
            category={category}
            selectedEmoji={selectedEmojiId}
            id={`${prefix}-${i}`}
            allEmojis={emojis}
            shouldRender={activeSetIndex >= i - 1 && activeSetIndex <= i + 1}
            observeIntersection={observeIntersectionForSet}
            onEmojiSelect={onEmojiSelect}
          />
        ))}
        {filteredSets.map((stickerSet, i) => {
          const shouldHideHeader = stickerSet.id === TOP_SYMBOL_SET_ID;

          return (
            <StickerSet
              key={stickerSet.id}
              stickerSet={stickerSet}
              loadAndPlay={Boolean(canAnimate && canLoadAndPlay)}
              index={i + filteredCategories.length}
              idPrefix={prefix}
              observeIntersection={observeIntersectionForSet}
              observeIntersectionForPlayingItems={observeIntersectionForPlayingItems}
              observeIntersectionForShowingItems={observeIntersectionForShowingItems}
              isNearActive={
                activeSetIndex >= i + filteredCategories.length - 1
                && activeSetIndex <= i + filteredCategories.length + 1
              }
              isSavedMessages={false}
              isFolderEmojiPicker={isFolderEmojiPicker}
              shouldHideHeader={shouldHideHeader}
              withDefaultTopicIcon={withDefaultTopicIcons && stickerSet.id === RECENT_SYMBOL_SET_ID}
              isChatEmojiSet={false}
              isCurrentUserPremium={isCurrentUserPremium}
              selectedStickerId={selectedEmojiId}
              selectedReactionIds={selectedReactionIds}
              isTranslucent={isTranslucent}
              onStickerSelect={handleEmojiSelect}
              onContextMenuOpen={onContextMenuOpen}
              onContextMenuClose={onContextMenuClose}
              onContextMenuClick={onContextMenuClick}
              forcePlayback
            />
          );
        })}
      </div>
    </div>
  );
};

export default memo(withGlobal<OwnProps>(
  (global): StateProps => {
    const {
      stickers: {
        setsById: stickerSetsById,
      },
      customEmojis: {
        byId: customEmojisById,
        featuredIds: customEmojiFeaturedIds,
      },
    } = global;

    return {
      customEmojisById,
      stickerSetsById,
      addedCustomEmojiIds: global.customEmojis.added.setIds,
      canAnimate: selectCanPlayAnimatedEmojis(global),
      isCurrentUserPremium: selectIsCurrentUserPremium(global),
      customEmojiFeaturedIds,
    };
  },
)(MergedEmojiPicker));
