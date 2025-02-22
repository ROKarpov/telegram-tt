import type { RefObject } from 'react';
import React, {
  memo, useCallback, useEffect, useMemo, useState,
} from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { GlobalState } from '../../global/types';
import type { FoldersActions } from '../../hooks/reducers/useFoldersReducer';
import type { ReducerAction } from '../../hooks/useReducer';
import { LeftColumnContent, SettingsScreens } from '../../types';

import { selectCurrentChat, selectIsForumPanelOpen, selectTabState } from '../../global/selectors';
import captureEscKeyListener from '../../util/captureEscKeyListener';
import { captureControlledSwipe } from '../../util/swipeController';
import {
  IS_APP, IS_FIREFOX, IS_MAC_OS, IS_TOUCH_ENV, LAYERS_ANIMATION_NAME,
} from '../../util/windowEnvironment';

import useFoldersReducer from '../../hooks/reducers/useFoldersReducer';
import { useHotkeys } from '../../hooks/useHotkeys';
import useLastCallback from '../../hooks/useLastCallback';
import usePrevious from '../../hooks/usePrevious';
import { useStateRef } from '../../hooks/useStateRef';
import useSyncEffect from '../../hooks/useSyncEffect';

import Transition from '../ui/Transition';
import ArchivedChats from './ArchivedChats.async';
import LeftMain from './main/LeftMain';
import NewChat from './newChat/NewChat.async';
import Settings from './settings/Settings.async';

import './LeftColumn.scss';

interface OwnProps {
  ref: RefObject<HTMLDivElement>;
}

type StateProps = {
  content: LeftColumnContent;
  settingsScreen: SettingsScreens;
  searchQuery?: string;
  searchDate?: number;
  isFirstChatFolderActive: boolean;
  shouldSkipHistoryAnimations?: boolean;
  currentUserId?: string;
  hasPasscode?: boolean;
  nextSettingsScreen?: SettingsScreens;
  nextFoldersAction?: ReducerAction<FoldersActions>;
  isChatOpen: boolean;
  isAppUpdateAvailable?: boolean;
  isElectronUpdateAvailable?: boolean;
  isForumPanelOpen?: boolean;
  forumPanelChatId?: string;
  isClosingSearch?: boolean;
  archiveSettings: GlobalState['archiveSettings'];
  isArchivedStoryRibbonShown?: boolean;
};

enum ContentType {
  Main,
  // eslint-disable-next-line @typescript-eslint/no-shadow
  Settings,
  Archived,
  // eslint-disable-next-line no-shadow
  NewGroup,
  // eslint-disable-next-line no-shadow
  NewChannel,
}

const RENDER_COUNT = Object.keys(ContentType).length / 2;
const RESET_TRANSITION_DELAY_MS = 250;

function LeftColumn({
  ref,
  content,
  settingsScreen,
  searchQuery,
  searchDate,
  isFirstChatFolderActive,
  shouldSkipHistoryAnimations,
  currentUserId,
  hasPasscode,
  nextSettingsScreen,
  nextFoldersAction,
  isChatOpen,
  isAppUpdateAvailable,
  isElectronUpdateAvailable,
  isForumPanelOpen,
  forumPanelChatId,
  isClosingSearch,
  archiveSettings,
  isArchivedStoryRibbonShown,
}: OwnProps & StateProps) {
  const {
    setLeftColumnContent,
    setGlobalSearchQuery,
    setGlobalSearchChatId,
    loadPasswordInfo,
    clearTwoFaError,
    openChat,
    requestNextSettingsScreen,
    setSettingsScreen,
    setGlobalSearchClosing,
    resetChatCreation,
    setGlobalSearchDate,
  } = getActions();

  const [contactsFilter, setContactsFilter] = useState<string>('');
  const [foldersState, foldersDispatch] = useFoldersReducer();

  // Used to reset child components in background.
  const [lastResetTime, setLastResetTime] = useState<number>(0);

  let contentType: ContentType = ContentType.Main;
  switch (content) {
    case LeftColumnContent.Archived:
      contentType = ContentType.Archived;
      break;
    case LeftColumnContent.Settings:
      contentType = ContentType.Settings;
      break;
    case LeftColumnContent.NewChannelStep1:
    case LeftColumnContent.NewChannelStep2:
      contentType = ContentType.NewChannel;
      break;
    case LeftColumnContent.NewGroupStep1:
    case LeftColumnContent.NewGroupStep2:
      contentType = ContentType.NewGroup;
      break;
  }

  const handleReset = useLastCallback((forceReturnToChatList?: true | Event) => {
    function fullReset() {
      setLeftColumnContent({ content: LeftColumnContent.ChatList });
      setSettingsScreen({ screen: SettingsScreens.Main });
      setContactsFilter('');
      setGlobalSearchClosing({ isClosing: true });
      resetChatCreation();
      setTimeout(() => {
        setGlobalSearchQuery({ query: '' });
        setGlobalSearchDate({ date: undefined });
        setGlobalSearchChatId({ id: undefined });
        setGlobalSearchClosing({ isClosing: false });
        setLastResetTime(Date.now());
      }, RESET_TRANSITION_DELAY_MS);
    }

    if (forceReturnToChatList === true) {
      fullReset();
      return;
    }

    if (content === LeftColumnContent.NewGroupStep2) {
      setLeftColumnContent({ content: LeftColumnContent.NewGroupStep1 });
      return;
    }

    if (content === LeftColumnContent.NewChannelStep2) {
      setLeftColumnContent({ content: LeftColumnContent.NewChannelStep1 });
      return;
    }

    if (content === LeftColumnContent.NewGroupStep1) {
      const pickerSearchInput = document.getElementById('new-group-picker-search');
      if (pickerSearchInput) {
        pickerSearchInput.blur();
      }
    }

    if (content === LeftColumnContent.Settings) {
      switch (settingsScreen) {
        case SettingsScreens.EditProfile:
        case SettingsScreens.Folders:
        case SettingsScreens.General:
        case SettingsScreens.Notifications:
        case SettingsScreens.DataStorage:
        case SettingsScreens.Privacy:
        case SettingsScreens.Performance:
        case SettingsScreens.ActiveSessions:
        case SettingsScreens.Language:
        case SettingsScreens.Stickers:
        case SettingsScreens.Experimental:
          setSettingsScreen({ screen: SettingsScreens.Main });
          return;

        case SettingsScreens.GeneralChatBackground:
          setSettingsScreen({ screen: SettingsScreens.General });
          return;
        case SettingsScreens.GeneralChatBackgroundColor:
          setSettingsScreen({ screen: SettingsScreens.GeneralChatBackground });
          return;

        case SettingsScreens.PrivacyPhoneNumber:
        case SettingsScreens.PrivacyAddByPhone:
        case SettingsScreens.PrivacyLastSeen:
        case SettingsScreens.PrivacyProfilePhoto:
        case SettingsScreens.PrivacyBio:
        case SettingsScreens.PrivacyBirthday:
        case SettingsScreens.PrivacyGifts:
        case SettingsScreens.PrivacyPhoneCall:
        case SettingsScreens.PrivacyPhoneP2P:
        case SettingsScreens.PrivacyForwarding:
        case SettingsScreens.PrivacyGroupChats:
        case SettingsScreens.PrivacyVoiceMessages:
        case SettingsScreens.PrivacyMessages:
        case SettingsScreens.PrivacyBlockedUsers:
        case SettingsScreens.ActiveWebsites:
        case SettingsScreens.TwoFaDisabled:
        case SettingsScreens.TwoFaEnabled:
        case SettingsScreens.TwoFaCongratulations:
        case SettingsScreens.PasscodeDisabled:
        case SettingsScreens.PasscodeEnabled:
        case SettingsScreens.PasscodeCongratulations:
          setSettingsScreen({ screen: SettingsScreens.Privacy });
          return;

        case SettingsScreens.PasscodeNewPasscode:
          setSettingsScreen({
            screen: hasPasscode ? SettingsScreens.PasscodeEnabled : SettingsScreens.PasscodeDisabled,
          });
          return;

        case SettingsScreens.PasscodeChangePasscodeCurrent:
        case SettingsScreens.PasscodeTurnOff:
          setSettingsScreen({ screen: SettingsScreens.PasscodeEnabled });
          return;

        case SettingsScreens.PasscodeNewPasscodeConfirm:
          setSettingsScreen({ screen: SettingsScreens.PasscodeNewPasscode });
          return;

        case SettingsScreens.PasscodeChangePasscodeNew:
          setSettingsScreen({ screen: SettingsScreens.PasscodeChangePasscodeCurrent });
          return;

        case SettingsScreens.PasscodeChangePasscodeConfirm:
          setSettingsScreen({ screen: SettingsScreens.PasscodeChangePasscodeNew });
          return;

        case SettingsScreens.PrivacyPhoneNumberAllowedContacts:
        case SettingsScreens.PrivacyPhoneNumberDeniedContacts:
          setSettingsScreen({ screen: SettingsScreens.PrivacyPhoneNumber });
          return;
        case SettingsScreens.PrivacyLastSeenAllowedContacts:
        case SettingsScreens.PrivacyLastSeenDeniedContacts:
          setSettingsScreen({ screen: SettingsScreens.PrivacyLastSeen });
          return;
        case SettingsScreens.PrivacyProfilePhotoAllowedContacts:
        case SettingsScreens.PrivacyProfilePhotoDeniedContacts:
          setSettingsScreen({ screen: SettingsScreens.PrivacyProfilePhoto });
          return;
        case SettingsScreens.PrivacyBioAllowedContacts:
        case SettingsScreens.PrivacyBioDeniedContacts:
          setSettingsScreen({ screen: SettingsScreens.PrivacyBio });
          return;
        case SettingsScreens.PrivacyBirthdayAllowedContacts:
        case SettingsScreens.PrivacyBirthdayDeniedContacts:
          setSettingsScreen({ screen: SettingsScreens.PrivacyBirthday });
          return;
        case SettingsScreens.PrivacyGiftsAllowedContacts:
        case SettingsScreens.PrivacyGiftsDeniedContacts:
          setSettingsScreen({ screen: SettingsScreens.PrivacyGifts });
          return;
        case SettingsScreens.PrivacyPhoneCallAllowedContacts:
        case SettingsScreens.PrivacyPhoneCallDeniedContacts:
          setSettingsScreen({ screen: SettingsScreens.PrivacyPhoneCall });
          return;
        case SettingsScreens.PrivacyPhoneP2PAllowedContacts:
        case SettingsScreens.PrivacyPhoneP2PDeniedContacts:
          setSettingsScreen({ screen: SettingsScreens.PrivacyPhoneP2P });
          return;
        case SettingsScreens.PrivacyForwardingAllowedContacts:
        case SettingsScreens.PrivacyForwardingDeniedContacts:
          setSettingsScreen({ screen: SettingsScreens.PrivacyForwarding });
          return;
        case SettingsScreens.PrivacyVoiceMessagesAllowedContacts:
        case SettingsScreens.PrivacyVoiceMessagesDeniedContacts:
          setSettingsScreen({ screen: SettingsScreens.PrivacyVoiceMessages });
          return;
        case SettingsScreens.PrivacyGroupChatsAllowedContacts:
        case SettingsScreens.PrivacyGroupChatsDeniedContacts:
          setSettingsScreen({ screen: SettingsScreens.PrivacyGroupChats });
          return;
        case SettingsScreens.TwoFaNewPassword:
          setSettingsScreen({ screen: SettingsScreens.TwoFaDisabled });
          return;
        case SettingsScreens.TwoFaNewPasswordConfirm:
          setSettingsScreen({ screen: SettingsScreens.TwoFaNewPassword });
          return;
        case SettingsScreens.TwoFaNewPasswordHint:
          setSettingsScreen({ screen: SettingsScreens.TwoFaNewPasswordConfirm });
          return;
        case SettingsScreens.TwoFaNewPasswordEmail:
          setSettingsScreen({ screen: SettingsScreens.TwoFaNewPasswordHint });
          return;
        case SettingsScreens.TwoFaNewPasswordEmailCode:
          setSettingsScreen({ screen: SettingsScreens.TwoFaNewPasswordEmail });
          return;
        case SettingsScreens.TwoFaChangePasswordCurrent:
        case SettingsScreens.TwoFaTurnOff:
        case SettingsScreens.TwoFaRecoveryEmailCurrentPassword:
          setSettingsScreen({ screen: SettingsScreens.TwoFaEnabled });
          return;
        case SettingsScreens.TwoFaChangePasswordNew:
          setSettingsScreen({ screen: SettingsScreens.TwoFaChangePasswordCurrent });
          return;
        case SettingsScreens.TwoFaChangePasswordConfirm:
          setSettingsScreen({ screen: SettingsScreens.TwoFaChangePasswordNew });
          return;
        case SettingsScreens.TwoFaChangePasswordHint:
          setSettingsScreen({ screen: SettingsScreens.TwoFaChangePasswordConfirm });
          return;
        case SettingsScreens.TwoFaRecoveryEmail:
          setSettingsScreen({ screen: SettingsScreens.TwoFaRecoveryEmailCurrentPassword });
          return;
        case SettingsScreens.TwoFaRecoveryEmailCode:
          setSettingsScreen({ screen: SettingsScreens.TwoFaRecoveryEmail });
          return;

        case SettingsScreens.FoldersCreateFolder:
        case SettingsScreens.FoldersEditFolder:
          setSettingsScreen({ screen: SettingsScreens.Folders });
          return;

        case SettingsScreens.FoldersShare:
          setSettingsScreen({ screen: SettingsScreens.FoldersEditFolder });
          return;

        case SettingsScreens.FoldersIncludedChatsFromChatList:
        case SettingsScreens.FoldersExcludedChatsFromChatList:
          setSettingsScreen({ screen: SettingsScreens.FoldersEditFolderFromChatList });
          return;

        case SettingsScreens.FoldersEditFolderFromChatList:
        case SettingsScreens.FoldersEditFolderInvites:
          setLeftColumnContent({ content: LeftColumnContent.ChatList });
          setSettingsScreen({ screen: SettingsScreens.Main });
          return;

        case SettingsScreens.QuickReaction:
        case SettingsScreens.CustomEmoji:
          setSettingsScreen({ screen: SettingsScreens.Stickers });
          return;

        case SettingsScreens.DoNotTranslate:
          setSettingsScreen({ screen: SettingsScreens.Language });
          return;
        default:
          break;
      }
    }

    if (content === LeftColumnContent.ChatList && isFirstChatFolderActive) {
      setLeftColumnContent({ content: LeftColumnContent.GlobalSearch });

      return;
    }

    fullReset();
  });

  const handleSearchQuery = useLastCallback((query: string) => {
    if (content === LeftColumnContent.Contacts) {
      setContactsFilter(query);
      return;
    }

    setLeftColumnContent({ content: LeftColumnContent.GlobalSearch });

    if (query !== searchQuery) {
      setGlobalSearchQuery({ query });
    }
  });

  const handleTopicSearch = useLastCallback(() => {
    setLeftColumnContent({ content: LeftColumnContent.GlobalSearch });
    setGlobalSearchQuery({ query: '' });
    setGlobalSearchChatId({ id: forumPanelChatId });
  });

  useEffect(
    () => {
      const isArchived = content === LeftColumnContent.Archived;
      const isChatList = content === LeftColumnContent.ChatList;
      const noChatOrForumOpen = !isChatOpen && !isForumPanelOpen;
      // We listen for escape key only in these cases:
      // 1. When we are in archived chats and no chat or forum is open.
      // 2. When we are in any other screen except chat list and archived chat list.
      // 3. When we are in chat list and first chat folder is active and no chat or forum is open.
      if ((isArchived && noChatOrForumOpen) || (!isChatList && !isArchived)
        || (isFirstChatFolderActive && noChatOrForumOpen)) {
        return captureEscKeyListener(() => {
          handleReset();
        });
      } else {
        return undefined;
      }
    },
    [isFirstChatFolderActive, content, handleReset, isChatOpen, isForumPanelOpen],
  );

  const handleHotkeySearch = useLastCallback((e: KeyboardEvent) => {
    if (content === LeftColumnContent.GlobalSearch) {
      return;
    }

    e.preventDefault();
    setLeftColumnContent({ content: LeftColumnContent.GlobalSearch });
  });

  const handleHotkeySavedMessages = useLastCallback((e: KeyboardEvent) => {
    e.preventDefault();
    openChat({ id: currentUserId, shouldReplaceHistory: true });
  });

  const handleArchivedChats = useLastCallback((e: KeyboardEvent) => {
    e.preventDefault();
    setLeftColumnContent({ content: LeftColumnContent.Archived });
  });

  const handleHotkeySettings = useLastCallback((e: KeyboardEvent) => {
    e.preventDefault();
    setLeftColumnContent({ content: LeftColumnContent.Settings });
  });

  useHotkeys(useMemo(() => ({
    'Mod+Shift+F': handleHotkeySearch,
    // https://support.mozilla.org/en-US/kb/take-screenshots-firefox
    ...(!IS_FIREFOX && {
      'Mod+Shift+S': handleHotkeySavedMessages,
    }),
    ...(IS_APP && {
      'Mod+0': handleHotkeySavedMessages,
      'Mod+9': handleArchivedChats,
    }),
    ...(IS_MAC_OS && IS_APP && { 'Mod+,': handleHotkeySettings }),
  }), []));

  useEffect(() => {
    clearTwoFaError();

    if (settingsScreen === SettingsScreens.Privacy) {
      loadPasswordInfo();
    }
  }, [clearTwoFaError, loadPasswordInfo, settingsScreen]);

  useSyncEffect(() => {
    if (nextSettingsScreen !== undefined) {
      setLeftColumnContent({ content: LeftColumnContent.Settings });
      setSettingsScreen({ screen: nextSettingsScreen });
      requestNextSettingsScreen({ screen: undefined });
    }

    if (nextFoldersAction) {
      foldersDispatch(nextFoldersAction);
    }
  }, [foldersDispatch, nextFoldersAction, nextSettingsScreen, requestNextSettingsScreen]);

  const handleSettingsScreenSelect = useLastCallback((screen: SettingsScreens) => {
    setLeftColumnContent({ content: LeftColumnContent.Settings });
    setSettingsScreen({ screen });
  });

  const prevSettingsScreenRef = useStateRef(usePrevious(contentType === ContentType.Settings ? settingsScreen : -1));

  const handleContentChange = useCallback(
    (newContent: LeftColumnContent) => setLeftColumnContent({ content: newContent }),
    [setLeftColumnContent],
  );

  useEffect(() => {
    if (!IS_TOUCH_ENV) {
      return undefined;
    }

    return captureControlledSwipe(ref.current!, {
      excludedClosestSelector: '.ProfileInfo, .color-picker, .hue-picker',
      selectorToPreventScroll: '#Settings .custom-scroll',
      onSwipeRightStart: handleReset,
      onCancel: () => {
        setLeftColumnContent({ content: LeftColumnContent.Settings });
        handleSettingsScreenSelect(prevSettingsScreenRef.current!);
      },
    });
  }, [prevSettingsScreenRef, ref]);

  function renderContent(isActive: boolean) {
    switch (contentType) {
      case ContentType.Archived:
        return (
          <ArchivedChats
            isActive={isActive}
            onReset={handleReset}
            onTopicSearch={handleTopicSearch}
            foldersDispatch={foldersDispatch}
            onSettingsScreenSelect={handleSettingsScreenSelect}
            onLeftColumnContentChange={handleContentChange}
            isForumPanelOpen={isForumPanelOpen}
            archiveSettings={archiveSettings}
            isStoryRibbonShown={isArchivedStoryRibbonShown}
          />
        );
      case ContentType.Settings:
        return (
          <Settings
            isActive={isActive}
            currentScreen={settingsScreen}
            foldersState={foldersState}
            foldersDispatch={foldersDispatch}
            shouldSkipTransition={shouldSkipHistoryAnimations}
            onScreenSelect={handleSettingsScreenSelect}
            onReset={handleReset}
          />
        );
      case ContentType.NewChannel:
        return (
          <NewChat
            key={lastResetTime}
            isActive={isActive}
            isChannel
            content={content}
            onContentChange={handleContentChange}
            onReset={handleReset}
          />
        );
      case ContentType.NewGroup:
        return (
          <NewChat
            key={lastResetTime}
            isActive={isActive}
            content={content}
            onContentChange={handleContentChange}
            onReset={handleReset}
          />
        );
      default:
        return (
          <LeftMain
            content={content}
            isClosingSearch={isClosingSearch}
            searchQuery={searchQuery}
            searchDate={searchDate}
            contactsFilter={contactsFilter}
            foldersDispatch={foldersDispatch}
            onContentChange={handleContentChange}
            onSearchQuery={handleSearchQuery}
            onSettingsScreenSelect={handleSettingsScreenSelect}
            onReset={handleReset}
            shouldSkipTransition={shouldSkipHistoryAnimations}
            isAppUpdateAvailable={isAppUpdateAvailable}
            isElectronUpdateAvailable={isElectronUpdateAvailable}
            isForumPanelOpen={isForumPanelOpen}
            onTopicSearch={handleTopicSearch}
          />
        );
    }
  }

  return (
    <Transition
      ref={ref}
      name={shouldSkipHistoryAnimations ? 'none' : LAYERS_ANIMATION_NAME}
      renderCount={RENDER_COUNT}
      activeKey={contentType}
      shouldCleanup
      cleanupExceptionKey={ContentType.Main}
      shouldWrap
      wrapExceptionKey={ContentType.Main}
      id="LeftColumn"
      withSwipeControl
    >
      {renderContent}
    </Transition>
  );
}

export default memo(withGlobal<OwnProps>(
  (global): StateProps => {
    const tabState = selectTabState(global);
    const {
      globalSearch: {
        query,
        minDate,
      },
      leftColumnContent: content,
      settingsScreen,
      shouldSkipHistoryAnimations,
      activeChatFolder,
      nextSettingsScreen,
      nextFoldersAction,
      storyViewer: {
        isArchivedRibbonShown,
      },
    } = tabState;
    const {
      currentUserId,
      passcode: {
        hasPasscode,
      },
      isAppUpdateAvailable,
      isElectronUpdateAvailable,
      archiveSettings,
    } = global;

    const currentChat = selectCurrentChat(global);
    const isChatOpen = Boolean(currentChat?.id);
    const isForumPanelOpen = selectIsForumPanelOpen(global);
    const forumPanelChatId = tabState.forumPanelChatId;

    return {
      content,
      settingsScreen,
      searchQuery: query,
      searchDate: minDate,
      isFirstChatFolderActive: activeChatFolder === 0,
      shouldSkipHistoryAnimations,
      currentUserId,
      hasPasscode,
      nextSettingsScreen,
      nextFoldersAction,
      isChatOpen,
      isAppUpdateAvailable,
      isElectronUpdateAvailable,
      isForumPanelOpen,
      forumPanelChatId,
      isClosingSearch: tabState.globalSearch.isClosing,
      archiveSettings,
      isArchivedStoryRibbonShown: isArchivedRibbonShown,
    };
  },
)(LeftColumn));
