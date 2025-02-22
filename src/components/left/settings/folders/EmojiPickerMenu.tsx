import type { FC } from '../../../../lib/teact/teact';
import React, {
  memo, useEffect, useLayoutEffect,
} from '../../../../lib/teact/teact';
import { withGlobal } from '../../../../global';

import type { ApiSticker } from '../../../../api/types';
import type { IconName } from '../../../../types/icons';
import type { MenuPositionOptions } from '../../../ui/Menu';

import { selectIsContextMenuTranslucent, selectTabState } from '../../../../global/selectors';
import buildClassName from '../../../../util/buildClassName';
import { EMOJI_TO_ICON_MAP } from '../../../../util/folderConstants';

import useAppLayout from '../../../../hooks/useAppLayout';
import useLastCallback from '../../../../hooks/useLastCallback';
import useOldLang from '../../../../hooks/useOldLang';
import useShowTransitionDeprecated from '../../../../hooks/useShowTransitionDeprecated';

import Icon from '../../../common/icons/Icon';
import Button from '../../../ui/Button';
import Menu from '../../../ui/Menu';
import Portal from '../../../ui/Portal';
import MergedEmojiPicker from './MergedEmojiPicker';

import './EmojiPickerMenu.scss';

export type OwnProps = MenuPositionOptions & {
  className?: string;
  selectedEmojiId?: string;
  isOpen: boolean;
  idPrefix?: string;
  onLoad: () => void;
  onClose: () => void;
  onCloseAnimationEnd: () => void;
  withPortal: boolean;
  onEmojiSelect: (emoji: string) => void;
  onCustomEmojiSelect: (emoji: ApiSticker) => void;
};

type StateProps = {
  isLeftColumnShown: boolean;
  isBackgroundTranslucent?: boolean;
};

let isActivated = false;

const EmojiPickerMenu: FC<OwnProps & StateProps> = ({
  isOpen,
  idPrefix,
  className,
  isLeftColumnShown,
  isBackgroundTranslucent,
  selectedEmojiId,
  withPortal,
  onLoad,
  onClose,
  onCloseAnimationEnd,
  onEmojiSelect,
  onCustomEmojiSelect,
  ...menuProps
}) => {
  const { isMobile } = useAppLayout();

  const {
    shouldRender,
    transitionClassNames,
  } = useShowTransitionDeprecated(isOpen, onClose, false, false);

  const lang = useOldLang();

  if (!isActivated && isOpen) {
    isActivated = true;
  }

  useEffect(() => {
    onLoad();
  }, [onLoad]);

  useLayoutEffect(() => {
    if (!isMobile || !isOpen) {
      return undefined;
    }

    return () => {
      // setTimeout(() => {
      //   // requestMutation(() => {
      //   //
      //   // });
      // }, ANIMATION_DURATION);
    };
  }, [isMobile, isOpen]);

  const handleEmojiSelect = useLastCallback((emoji: string) => {
    onEmojiSelect(emoji);
    onClose();
  });

  const handleCustomEmojiSelect = useLastCallback((emoji: ApiSticker) => {
    onCustomEmojiSelect(emoji);
    onClose();
  });

  function stopPropagation(event: any) {
    event.stopPropagation();
  }

  function renderOverrideEmoji(emoji: string, icon: IconName) {
    const isSelected = selectedEmojiId === emoji;
    const handleClick = () => {
      onEmojiSelect(emoji);
      onClose();
    };
    return (
      <Button
        className={buildClassName('override-emoji', isSelected && 'selected')}
        size="tiny"
        color="translucent"
        // eslint-disable-next-line react/jsx-no-bind
        onClick={handleClick}
      >
        <Icon name={icon} />
      </Button>
    );
  }

  const content = (
    <>
      <div className="FileSettingsEmojiPickerMenu-main" onClick={stopPropagation}>
        {isActivated && (
          <MergedEmojiPicker
            className="picker-tab"
            isHidden={!isOpen}
            idPrefix={idPrefix}
            loadAndPlay={isOpen}
            selectedEmojiId={selectedEmojiId}
            isTranslucent={!isMobile && isBackgroundTranslucent}
            onEmojiSelect={handleEmojiSelect}
            onCustomEmojiSelect={handleCustomEmojiSelect}
            isFolderEmojiPicker
          >
            <div className="override-emoji-container">
              {Object.entries(EMOJI_TO_ICON_MAP).map(([value, icon]) => renderOverrideEmoji(value, icon))}
            </div>
          </MergedEmojiPicker>
        )}
      </div>
    </>
  );

  if (isMobile) {
    if (!shouldRender) {
      return undefined;
    }

    return (
      <Portal>
        <>
          <div
            className={buildClassName('FileSettingsEmojiPickerMenu-backdrop')}
            onClick={(e) => { e.stopPropagation(); onClose(); }}
          />
          <div
            className={buildClassName(
              'FileSettingsEmojiPickerMenu mobile-menu',
              transitionClassNames,
            )}
          >
            {content}
            <Button
              round
              faded
              color="translucent"
              ariaLabel={lang('Close')}
              className="close-button"
              size="tiny"
              onClick={onClose}
            >
              <Icon name="close" />
            </Button>
          </div>
        </>
      </Portal>
    );
  }

  return (
    <Menu
      isOpen={isOpen}
      className={buildClassName('FileSettingsEmojiPickerMenu', className)}
      onClose={onClose}
      onCloseAnimationEnd={onCloseAnimationEnd}
      withPortal={withPortal}
      noCompact
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...menuProps}
    >
      {content}
    </Menu>
  );
};

export default memo(withGlobal<OwnProps>(
  (global): StateProps => {
    return {
      isLeftColumnShown: selectTabState(global).isLeftColumnShown,
      isBackgroundTranslucent: selectIsContextMenuTranslucent(global),
    };
  },
)(EmojiPickerMenu));
