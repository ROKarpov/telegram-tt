import type { FC } from '../../../../lib/teact/teact';
import React, {
  memo, useCallback, useEffect, useMemo, useRef,
  useState,
} from '../../../../lib/teact/teact';
import { getActions, getGlobal, withGlobal } from '../../../../global';

import type { ApiChatlistExportedInvite } from '../../../../api/types';
import type {
  FolderEditDispatch,
  FoldersState,
} from '../../../../hooks/reducers/useFoldersReducer';

import { STICKER_SIZE_FOLDER_SETTINGS } from '../../../../config';
import { isUserId } from '../../../../global/helpers';
import { selectCanShareFolder } from '../../../../global/selectors';
import { selectCurrentLimit } from '../../../../global/selectors/limits';
import { findIntersectionWithSet } from '../../../../util/iteratees';
import { MEMO_EMPTY_ARRAY } from '../../../../util/memo';
import { CUSTOM_PEER_EXCLUDED_CHAT_TYPES, CUSTOM_PEER_INCLUDED_CHAT_TYPES } from '../../../../util/objects/customPeer';
import { LOCAL_TGS_URLS } from '../../../common/helpers/animatedAssets';

import { selectChatFilters } from '../../../../hooks/reducers/useFoldersReducer';
import useHistoryBack from '../../../../hooks/useHistoryBack';
import useOldLang from '../../../../hooks/useOldLang';

import AnimatedIconWithPreview from '../../../common/AnimatedIconWithPreview';
import GroupChatInfo from '../../../common/GroupChatInfo';
import Icon from '../../../common/icons/Icon';
import PrivateChatInfo from '../../../common/PrivateChatInfo';
import FloatingActionButton from '../../../ui/FloatingActionButton';
import InputText from '../../../ui/InputText';
import ListItem from '../../../ui/ListItem';
import Spinner from '../../../ui/Spinner';
import { EmojiPickerMenuButton } from './EmojiPickerMenuButton';

type OwnProps = {
  state: FoldersState;
  dispatch: FolderEditDispatch;
  onAddIncludedChats: VoidFunction;
  onAddExcludedChats: VoidFunction;
  onShareFolder: VoidFunction;
  onOpenInvite: (url: string) => void;
  isActive?: boolean;
  isOnlyInvites?: boolean;
  onReset: () => void;
  onBack: () => void;
  onSaveFolder: (cb?: VoidFunction) => void;
};

type StateProps = {
  loadedActiveChatIds?: string[];
  loadedArchivedChatIds?: string[];
  invites?: ApiChatlistExportedInvite[];
  isRemoved?: boolean;
  maxInviteLinks: number;
  maxChatLists: number;
  chatListCount: number;
};

const SUBMIT_TIMEOUT = 500;

const INITIAL_CHATS_LIMIT = 5;

export const ERROR_NO_TITLE = 'Please provide a title for this folder.';
export const ERROR_NO_CHATS = 'ChatList.Filter.Error.Empty';

const SettingsFoldersEdit: FC<OwnProps & StateProps> = ({
  state,
  dispatch,
  onAddIncludedChats,
  onAddExcludedChats,
  onShareFolder,
  onOpenInvite,
  isActive,
  onReset,
  isRemoved,
  onBack,
  loadedActiveChatIds,
  isOnlyInvites,
  loadedArchivedChatIds,
  invites,
  maxInviteLinks,
  maxChatLists,
  chatListCount,
  onSaveFolder,
}) => {
  // eslint-disable-next-line no-null/no-null
  const nameInputRef = useRef<HTMLInputElement>(null);

  const {
    loadChatlistInvites,
    openLimitReachedModal,
    showNotification,
  } = getActions();

  const isCreating = state.mode === 'create';
  const isEditingChatList = state.folder.isChatList;

  const [isIncludedChatsListExpanded, setIsIncludedChatsListExpanded] = useState(false);
  const [isExcludedChatsListExpanded, setIsExcludedChatsListExpanded] = useState(false);

  useEffect(() => {
    if (isRemoved) {
      onReset();
    }
  }, [isRemoved, onReset]);

  useEffect(() => {
    if (isActive && state.folderId && state.folder.isChatList) {
      loadChatlistInvites({ folderId: state.folderId });
    }
  }, [isActive, state.folder.isChatList, state.folderId]);

  const {
    selectedChatIds: includedChatIds,
    selectedChatTypes: includedChatTypes,
  } = useMemo(() => selectChatFilters(state, 'included'), [state]);
  const {
    selectedChatIds: excludedChatIds,
    selectedChatTypes: excludedChatTypes,
  } = useMemo(() => selectChatFilters(state, 'excluded'), [state]);

  useEffect(() => {
    setIsIncludedChatsListExpanded(false);
    setIsExcludedChatsListExpanded(false);
  }, [state.folderId]);

  const [visibleIncludedChatIds, visibleExcludedChatIds] = useMemo(() => {
    const allLoadedChatsSet = new Set([
      ...(loadedActiveChatIds || []),
      ...(loadedArchivedChatIds || []),
    ]);

    const loadedIncludedChatIds = findIntersectionWithSet(includedChatIds, allLoadedChatsSet);
    const loadedExcludedChatIds = findIntersectionWithSet(excludedChatIds, allLoadedChatsSet);

    return [
      isIncludedChatsListExpanded
        ? loadedIncludedChatIds
        : loadedIncludedChatIds.slice(0, INITIAL_CHATS_LIMIT - includedChatTypes.length),
      isExcludedChatsListExpanded
        ? loadedExcludedChatIds
        : loadedExcludedChatIds.slice(0, INITIAL_CHATS_LIMIT - excludedChatTypes.length),
    ];
  }, [
    excludedChatIds, includedChatIds, includedChatTypes, excludedChatTypes,
    isExcludedChatsListExpanded, isIncludedChatsListExpanded,
    loadedActiveChatIds, loadedArchivedChatIds,
  ]);

  const lang = useOldLang();

  useHistoryBack({
    isActive,
    onBack,
  });

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { currentTarget } = event;
    dispatch({ type: 'setTitle', payload: currentTarget.value.trim() });
  }, [dispatch]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    dispatch({ type: 'setEmoticon', payload: emoji });
  }, [dispatch]);

  const handleSubmit = useCallback(() => {
    dispatch({ type: 'setIsLoading', payload: true });

    onSaveFolder(() => {
      setTimeout(() => {
        onReset();
      }, SUBMIT_TIMEOUT);
    });
  }, [dispatch, onSaveFolder, onReset]);

  const handleCreateInviteClick = useCallback(() => {
    if (!invites) {
      if (isCreating) {
        onSaveFolder(onShareFolder);
      }
      return;
    }

    // Ignoring global updates is a known drawback here
    if (!selectCanShareFolder(getGlobal(), state.folderId!)) {
      showNotification({ message: lang('ChatList.Filter.InviteLink.IncludeExcludeError') });
      return;
    }

    if (chatListCount >= maxChatLists && !state.folder.isChatList) {
      openLimitReachedModal({
        limit: 'chatlistJoined',
      });
      return;
    }

    if (invites.length < maxInviteLinks) {
      if (state.isTouched) {
        onSaveFolder(onShareFolder);
      } else {
        onShareFolder();
      }
      return;
    }

    openLimitReachedModal({
      limit: 'chatlistInvites',
    });
  }, [
    invites, state.folderId, state.isTouched, chatListCount, maxInviteLinks, isCreating, onSaveFolder,
    onShareFolder, lang, maxChatLists, state.folder.isChatList,
  ]);

  const handleEditInviteClick = useCallback((e: React.MouseEvent<HTMLElement>, url: string) => {
    if (state.isTouched) {
      onSaveFolder(() => onOpenInvite(url));
    } else {
      onOpenInvite(url);
    }
  }, [onSaveFolder, onOpenInvite, state.isTouched]);

  function renderChatType(key: string, mode: 'included' | 'excluded') {
    const chatType = mode === 'included'
      ? CUSTOM_PEER_INCLUDED_CHAT_TYPES.find(({ type: typeKey }) => typeKey === key)
      : CUSTOM_PEER_EXCLUDED_CHAT_TYPES.find(({ type: typeKey }) => typeKey === key);

    if (!chatType) {
      return undefined;
    }

    return (
      <ListItem
        key={chatType.type}
        className="settings-folders-list-item mb-1"
        narrow
        inactive
      >
        <PrivateChatInfo
          avatarSize="small"
          customPeer={chatType}
        />
      </ListItem>
    );
  }

  function renderChats(mode: 'included' | 'excluded') {
    const selectedChatTypes = mode === 'included' ? includedChatTypes : excludedChatTypes;
    const visibleChatIds = mode === 'included' ? visibleIncludedChatIds : visibleExcludedChatIds;

    const isExpanded = mode === 'included' ? isIncludedChatsListExpanded : isExcludedChatsListExpanded;
    const allChatIds = mode === 'included' ? includedChatIds : excludedChatIds;
    const leftChatsCount = allChatIds.length - visibleChatIds.length;
    const clickHandler = mode === 'included'
      ? () => setIsIncludedChatsListExpanded(true)
      : () => setIsExcludedChatsListExpanded(true);

    return (
      <>
        {selectedChatTypes.map((key) => renderChatType(key, mode))}
        {visibleChatIds.map((id) => (
          <ListItem
            className="settings-folders-list-item mb-1"
            narrow
            inactive
          >
            {isUserId(id) ? (
              <PrivateChatInfo avatarSize="small" userId={id} />
            ) : (
              <GroupChatInfo avatarSize="small" chatId={id} />
            )}
          </ListItem>
        ))}
        {(!isExpanded && leftChatsCount > 0) && (
          <ListItem
            key="load-more"
            className="settings-folders-list-item"
            narrow
            // eslint-disable-next-line react/jsx-no-bind
            onClick={clickHandler}
            icon="down"
          >
            {lang('FilterShowMoreChats', leftChatsCount, 'i')}
          </ListItem>
        )}
      </>
    );
  }

  return (
    <div className="settings-fab-wrapper">
      <div className="settings-content no-border custom-scroll">
        <div className="settings-content-header">
          <AnimatedIconWithPreview
            size={STICKER_SIZE_FOLDER_SETTINGS}
            tgsUrl={LOCAL_TGS_URLS.FoldersNew}
            play={String(state.folderId)}
            className="settings-content-icon"
          />

          {isCreating && (
            <p className="settings-item-description mb-3" dir={lang.isRtl ? 'rtl' : undefined}>
              {lang('FilterIncludeInfo')}
            </p>
          )}

          <InputText
            ref={nameInputRef}
            className="mb-0"
            label={lang('FilterNameHint')}
            value={state.folder.title.text}
            onChange={handleChange}
            error={state.error && state.error === ERROR_NO_TITLE ? ERROR_NO_TITLE : undefined}
            endAdornment={<EmojiPickerMenuButton emoticon={state.folder.emoticon} onEmojiSelect={handleEmojiSelect} />}
          />
        </div>

        {!isOnlyInvites && (
          <div className="settings-item pt-3">
            {state.error && state.error === ERROR_NO_CHATS && (
              <p className="settings-item-description color-danger mb-2" dir={lang.isRtl ? 'rtl' : undefined}>
                {lang(state.error)}
              </p>
            )}

            <h4 className="settings-item-header mb-3" dir={lang.isRtl ? 'rtl' : undefined}>{lang('FilterInclude')}</h4>

            <ListItem
              className="settings-folders-list-item color-primary"
              icon="add"
              narrow
              onClick={onAddIncludedChats}
            >
              {lang('FilterAddChats')}
            </ListItem>

            {renderChats('included')}
          </div>
        )}

        {!isOnlyInvites && !isEditingChatList && (
          <div className="settings-item pt-3">
            <h4 className="settings-item-header mb-3" dir={lang.isRtl ? 'rtl' : undefined}>{lang('FilterExclude')}</h4>

            <ListItem
              className="settings-folders-list-item color-primary"
              icon="add"
              narrow
              onClick={onAddExcludedChats}
            >
              {lang('FilterAddChats')}
            </ListItem>

            {renderChats('excluded')}
          </div>
        )}

        <div className="settings-item pt-3">
          <h4 className="settings-item-header mb-3" dir={lang.isRtl ? 'rtl' : undefined}>
            {lang('FolderLinkScreen.Title')}
          </h4>

          <ListItem
            className="settings-folders-list-item color-primary"
            icon="add"
            narrow
            onClick={handleCreateInviteClick}
          >
            {lang('ChatListFilter.CreateLinkNew')}
          </ListItem>

          {invites?.map((invite) => (
            <ListItem
              className="settings-folders-list-item"
              icon="link"
              narrow
              multiline
              onClick={handleEditInviteClick}
              clickArg={invite.url}
            >
              <span className="title" dir="auto">{invite.title || invite.url}</span>
              <span className="subtitle">
                {lang('ChatListFilter.LinkLabelChatCount', invite.peerIds.length, 'i')}
              </span>
            </ListItem>
          ))}

        </div>
      </div>

      <FloatingActionButton
        isShown={Boolean(state.isTouched)}
        disabled={state.isLoading}
        onClick={handleSubmit}
        ariaLabel={state.mode === 'edit' ? 'Save changes' : 'Create folder'}
      >
        {state.isLoading ? (
          <Spinner color="white" />
        ) : (
          <Icon name="check" />
        )}
      </FloatingActionButton>
    </div>
  );
};

export default memo(withGlobal<OwnProps>(
  (global, { state }): StateProps => {
    const { listIds } = global.chats;
    const { byId, invites } = global.chatFolders;
    const chatListCount = Object.values(byId).reduce((acc, el) => acc + (el.isChatList ? 1 : 0), 0);

    return {
      loadedActiveChatIds: listIds.active,
      loadedArchivedChatIds: listIds.archived,
      invites: state.folderId ? (invites[state.folderId] || MEMO_EMPTY_ARRAY) : undefined,
      isRemoved: state.folderId !== undefined && !byId[state.folderId],
      maxInviteLinks: selectCurrentLimit(global, 'chatlistInvites'),
      maxChatLists: selectCurrentLimit(global, 'chatlistJoined'),
      chatListCount,
    };
  },
)(SettingsFoldersEdit));
