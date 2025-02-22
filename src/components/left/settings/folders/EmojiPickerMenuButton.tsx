import type { FC } from '../../../../lib/teact/teact';
import React, { useCallback, useRef, useState } from '../../../../lib/teact/teact';

import type { ApiSticker } from '../../../../api/types';
import type { Layout } from '../../../../hooks/useMenuPosition';
import type { IAnchorPosition } from '../../../../types';

import FolderEmoticon from '../../../common/FolderImoticon';
import Button from '../../../ui/Button';
import EmojiPickerMenu from './EmojiPickerMenu';

import './EmojiPickerMenuButton.scss';

type EmojiPickerMenuButtonProps = {
  emoticon: string | undefined;
  onEmojiSelect: (emoji: string) => void;
};

export const EmojiPickerMenuButton: FC<EmojiPickerMenuButtonProps> = ({ emoticon, onEmojiSelect }) => {
  // eslint-disable-next-line no-null/no-null
  const triggerRef = useRef<HTMLDivElement>(null);

  const [isMenuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<IAnchorPosition | undefined>(undefined);

  const handleContextMenuClick = useCallback(
    () => {
      if (triggerRef.current) {
        const btnRect = triggerRef.current.getBoundingClientRect();
        setMenuAnchor({
          x: btnRect.left,
          y: btnRect.bottom,
        });
        setMenuOpen(true);
      }
    },
    [],
  );

  const handleContextMenuClose = useCallback(
    () => setMenuOpen(false),
    [],
  );

  const handleContextMenuHide = useCallback(
    () => setMenuAnchor(undefined),
    [],
  );

  const handleLoad = useCallback(() => {}, []);
  const handleCustomEmojiSelect = useCallback(
    // It's unclear how to use custom emojis in folder emoticons. No format in doc.
    // Also, server does not save all emojis, only subset associated with images.
    // So, implemented the picker from the mocks, but seems it cannot work as intended.
    // TODO: Implement custom emojis' selection, once BE supports them.
    (emoji: ApiSticker) => {
      if (emoji.emoji) {
        onEmojiSelect(emoji.emoji);
      }
    },
    [onEmojiSelect],
  );

  const getMenuElement = useCallback(() => document.querySelector('#portals .FileSettingsEmojiPickerMenu .bubble'), []);
  const getTriggerElement = useCallback(() => triggerRef.current, [triggerRef]);
  const getRootElement = useCallback(() => triggerRef.current!.closest('.custom-scroll, .no-scrollbar'), [triggerRef]);
  const getLayout = useCallback((): Layout => ({ withPortal: true }), []);

  return (
    <>
      <div ref={triggerRef}>
        <Button
          size="tiny"
          color="translucent"
          onClick={handleContextMenuClick}
        >
          <FolderEmoticon emoticon={emoticon} className="emoji-picker-menu-folder-icon" />
        </Button>
      </div>
      {triggerRef.current && (
        <EmojiPickerMenu
          isOpen={isMenuOpen}
          anchor={menuAnchor}
          selectedEmojiId={emoticon}
          onLoad={handleLoad}
          onClose={handleContextMenuClose}
          onCloseAnimationEnd={handleContextMenuHide}
          onEmojiSelect={onEmojiSelect}
          onCustomEmojiSelect={handleCustomEmojiSelect}
          getMenuElement={getMenuElement}
          getTriggerElement={getTriggerElement}
          getRootElement={getRootElement}
          getLayout={getLayout}
          withPortal
        />
      )}
    </>
  );
};
