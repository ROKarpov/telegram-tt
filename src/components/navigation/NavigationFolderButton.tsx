import type { FC } from '../../lib/teact/teact';
import React from '../../lib/teact/teact';

import type { TabWithProperties } from '../../hooks/shared/useFolderTabs';

import buildClassName from '../../util/buildClassName';

import FolderEmoticon from '../common/FolderImoticon';
import Button from '../ui/Button';

import './NavigationFolderButton.scss';

type NavigationFolderButtonProps = {
  className?: string;
  tab: TabWithProperties;
  isSelected?: boolean;
  onClick: VoidFunction;
};

const NavigationFolderButton: FC<NavigationFolderButtonProps> = ({
  className, tab, isSelected, onClick,
}) => (
  <Button
    className={buildClassName('folder-navigation-item', isSelected && 'selected', className)}
    color="translucent"
    onClick={onClick}
  >
    <div className="folder-navigation-item_icon-container">
      <FolderEmoticon className="folder-navigation-item_icon" id={tab.id} emoticon={tab.emoticon} />
      {tab.badgeCount !== 0 && (
        <span className="folder-navigation-item_unread-count">
          {tab.badgeCount}
        </span>
      )}
    </div>
    <span>
      {tab.title}
    </span>
  </Button>
);

export default NavigationFolderButton;
