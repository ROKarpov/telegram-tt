import type { FC } from '../../lib/teact/teact';
import React, { memo } from '../../lib/teact/teact';
import { withGlobal } from '../../global';

import type { ApiChatFolder, ApiChatlistExportedInvite } from '../../api/types';

import { selectTabState } from '../../global/selectors';
import { selectCurrentLimit } from '../../global/selectors/limits';

import MainMenuButton from './MainMenuButton';
import NavigationFolderList from './NavigationFolderList';

import './Navigation.scss';

type NavigationOwnProps = {
  id: string;
};

type StateProps = {
  shouldSkipTransition?: boolean;
  maxFolders: number;
  orderedFolderIds?: number[];
  chatFoldersById: Record<number, ApiChatFolder>;
  maxChatLists: number;
  folderInvitesById: Record<number, ApiChatlistExportedInvite[]>;
  maxFolderInvites: number;
};

const Navigation: FC<NavigationOwnProps & StateProps> = ({
  id,
  shouldSkipTransition,
}) => {
  return (
    <div id={id} className="navigation">
      <MainMenuButton
        className="navigation-dropdown"
        shouldSkipTransition={shouldSkipTransition}
      />
      <div className="navigation-list-container">
        <NavigationFolderList />
      </div>
    </div>
  );
};

export default memo(withGlobal<NavigationOwnProps>(
  (global): StateProps => {
    const tabState = selectTabState(global);
    const {
      shouldSkipHistoryAnimations: shouldSkipTransition,
    } = tabState;

    const {
      chatFolders: {
        byId: chatFoldersById,
        orderedIds: orderedFolderIds,
        invites: folderInvitesById,
      },
    } = global;

    return {
      shouldSkipTransition,
      maxFolders: selectCurrentLimit(global, 'dialogFilters'),
      maxFolderInvites: selectCurrentLimit(global, 'chatlistInvites'),
      maxChatLists: selectCurrentLimit(global, 'chatlistJoined'),

      orderedFolderIds,
      chatFoldersById,
      folderInvitesById,
    };
  },
)(Navigation));
