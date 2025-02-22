import type { FC } from '../../lib/teact/teact';
import React, { useCallback } from '../../lib/teact/teact';
import { getActions } from '../../global';

import type { OwnProps as ButtonOwnProps } from '../ui/Button';
import type { DropdownMenuOwnProps } from '../ui/DropdownMenu';
import { LeftColumnContent } from '../../types';

import { APP_NAME, DEBUG, IS_BETA } from '../../config';
import buildClassName from '../../util/buildClassName';
import { IS_ELECTRON, IS_MAC_OS } from '../../util/windowEnvironment';

import useAppLayout from '../../hooks/useAppLayout';
import useFlag from '../../hooks/useFlag';
import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';
import { useFullscreenStatus } from '../../hooks/window/useFullscreen';

import LeftSideMenuItems from '../left/main/LeftSideMenuItems';
import Button from '../ui/Button';
import DropdownMenu from '../ui/DropdownMenu';

import './MainMenuButton.scss';

const VERSION_STRING = IS_BETA ? `${APP_VERSION} Beta (${APP_REVISION})` : (DEBUG ? APP_REVISION : APP_VERSION);

type NavigationMenuButtonProps =
  Pick<DropdownMenuOwnProps, 'positionX' | 'positionY' | 'transformOriginX' | 'transformOriginY' | 'onTransitionEnd'>
  & {
    className?: string;
    shouldSkipTransition?: boolean;
    isBack?: boolean;
    triggerSize?: ButtonOwnProps['size'];
    onBack?: VoidFunction;
  };

const MainMenuButton: FC<NavigationMenuButtonProps> = ({
  className,
  isBack,
  triggerSize = 'default',
  onBack,
  shouldSkipTransition,
  ...menuProps
}) => {
  const { closeForumPanel, setLeftColumnContent, toggleLeftColumn } = getActions();

  const handleSelectSettings = useLastCallback(() => {
    setLeftColumnContent({ content: LeftColumnContent.Settings });
    toggleLeftColumn({ forceOpen: true });
  });

  const handleSelectContacts = useLastCallback(() => {
    setLeftColumnContent({ content: LeftColumnContent.Contacts });
    toggleLeftColumn({ forceOpen: true });
  });

  const handleSelectArchived = useLastCallback(() => {
    setLeftColumnContent({ content: LeftColumnContent.Archived });
    closeForumPanel();
    toggleLeftColumn({ forceOpen: true });
  });

  const oldLang = useLang();
  const { isMobile } = useAppLayout();

  const [isBotMenuOpen, markBotMenuOpen, unmarkBotMenuOpen] = useFlag();

  const isFullscreen = useFullscreenStatus();

  const hasMenu = !isBack;

  const MainButton: FC<{ onTrigger: () => void; isOpen?: boolean }> = useCallback(
    ({ onTrigger, isOpen }) => {
      return (
        <Button
          round
          ripple={hasMenu && !isMobile}
          size={triggerSize}
          color="translucent"
          className={isOpen ? 'active' : ''}
          // eslint-disable-next-line react/jsx-no-bind
          onClick={hasMenu ? onTrigger : onBack}
          ariaLabel={hasMenu ? oldLang('AccDescrOpenMenu2') : 'Return to chat list'}
        >
          <div className={buildClassName(
            'animated-menu-icon',
            !hasMenu && 'state-back',
            shouldSkipTransition && 'no-animation',
          )}
          />
        </Button>
      );
    },
    [hasMenu, triggerSize, isMobile, oldLang, onBack, shouldSkipTransition],
  );

  return (
    <>
      {oldLang.isRtl && <div className="DropdownMenuFiller" />}
      <DropdownMenu
        trigger={MainButton}
        footer={`${APP_NAME} ${VERSION_STRING}`}
        className={buildClassName(
          'main-menu',
          oldLang.isRtl && 'rtl',
          className,
        )}
        forceOpen={isBotMenuOpen}
        transformOriginX={IS_ELECTRON && IS_MAC_OS && !isFullscreen ? 90 : undefined}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...menuProps}
      >
        <LeftSideMenuItems
          onSelectArchived={handleSelectArchived}
          onSelectContacts={handleSelectContacts}
          onSelectSettings={handleSelectSettings}
          onBotMenuOpened={markBotMenuOpen}
          onBotMenuClosed={unmarkBotMenuOpen}
        />
      </DropdownMenu>
    </>
  );
};

export default MainMenuButton;
