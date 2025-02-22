import type { FC } from '../../lib/teact/teact';
import React, { memo } from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { ApiChatFolder, ApiChatlistExportedInvite } from '../../api/types';
import { LeftColumnContent } from '../../types';

import { selectTabState } from '../../global/selectors';
import { selectCurrentLimit } from '../../global/selectors/limits';

import { useFolderTabs } from '../../hooks/shared/useFolderTabs';
import useLang from '../../hooks/useLang';

import NavigationFolderButton from './NavigationFolderButton';

import './NavigationFolderList.scss';

type NavigationFoldersOwnProps = {

};

type StateProps = {
  activeChatFolder: number;
  maxFolders: number;
  orderedFolderIds?: number[];
  chatFoldersById: Record<number, ApiChatFolder>;
  maxChatLists: number;
  folderInvitesById: Record<number, ApiChatlistExportedInvite[]>;
  maxFolderInvites: number;
};

const NavigationFolderList: FC<NavigationFoldersOwnProps & StateProps> = ({
  activeChatFolder,
  maxFolders,
  orderedFolderIds,
  chatFoldersById,
  maxChatLists,
  folderInvitesById,
  maxFolderInvites,
}) => {
  const {
    setActiveChatFolder,
    setLeftColumnContent,
    toggleLeftColumn,
  } = getActions();

  const lang = useLang();

  const foldersTabs = useFolderTabs({
    maxFolders,
    orderedFolderIds,
    chatFoldersById,
    maxChatLists,
    folderInvitesById,
    maxFolderInvites,
  });

  return (
    <div
      className="navigation-folder-list"
      dir={lang.isRtl ? 'rtl' : undefined}
    >
      {foldersTabs?.map((tab, index) => {
        const handleClick = () => {
          setActiveChatFolder({ activeChatFolder: index });
          setLeftColumnContent({ content: LeftColumnContent.ChatList });
          toggleLeftColumn({ forceOpen: true });
        };
        return (
          <NavigationFolderButton
            key={tab.id}
            className="item"
            tab={tab}
            isSelected={activeChatFolder === index}
            // eslint-disable-next-line react/jsx-no-bind
            onClick={handleClick}
          />
        );
      })}
    </div>
  );
};

export default memo(withGlobal<NavigationFoldersOwnProps>(
  (global): StateProps => {
    const {
      chatFolders: {
        byId: chatFoldersById,
        orderedIds: orderedFolderIds,
        invites: folderInvitesById,
      },
    } = global;

    const { activeChatFolder } = selectTabState(global);
    return {
      activeChatFolder,
      maxFolders: selectCurrentLimit(global, 'dialogFilters'),
      maxFolderInvites: selectCurrentLimit(global, 'chatlistInvites'),
      maxChatLists: selectCurrentLimit(global, 'chatlistJoined'),

      orderedFolderIds,
      chatFoldersById,
      folderInvitesById,
    };
  },
)(NavigationFolderList));
