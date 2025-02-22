import type { FC } from '../../lib/teact/teact';
import React from '../../lib/teact/teact';

import { ALL_FOLDER_ID } from '../../config';
import buildClassName from '../../util/buildClassName';
import { EMOJI_TO_ICON_MAP } from '../../util/folderConstants';

import Icon from './icons/Icon';

type FolderEmoticonProps = {
  id?: number;
  emoticon: string | undefined;
  className?: string;
};

const FolderEmoticon: FC<FolderEmoticonProps> = ({ className, id, emoticon }) => {
  if (id === ALL_FOLDER_ID) {
    return <Icon className={className} name="chats-badge" />;
  }
  if (!emoticon) {
    return <Icon className={className} name="folder-badge" />;
  }
  const icon = EMOJI_TO_ICON_MAP[emoticon];
  if (icon) {
    return <Icon className={className} name={icon} />;
  }
  return <span className={buildClassName('folder-emoticon', className)}>{emoticon}</span>;
};

export default FolderEmoticon;
