import { useEffect, useMemo, useState } from '../../lib/teact/teact';

import type { EmojiData, EmojiModule, EmojiRawData } from '../../util/emoji/emoji';

import { RECENT_SYMBOL_SET_ID } from '../../config';
import { uncompressEmoji } from '../../util/emoji/emoji';
import { MEMO_EMPTY_ARRAY } from '../../util/memo';
import useLang from '../useLang';

type UseEmojiDataArgs = {
  hideRecent?: boolean;
  recentEmojis?: string[];
};

export type EmojiCategoryData = { id: string; name: string; emojis: string[] };

const OPEN_ANIMATION_DELAY = 200;

let emojiDataPromise: Promise<EmojiModule>;
let emojiRawData: EmojiRawData;
let emojiData: EmojiData;

async function ensureEmojiData() {
  if (!emojiDataPromise) {
    emojiDataPromise = import('emoji-data-ios/emoji-data.json');
    emojiRawData = (await emojiDataPromise).default;

    emojiData = uncompressEmoji(emojiRawData);
  }

  return emojiDataPromise;
}

type UseEmojiDataStored = {
  categories: EmojiCategoryData[] | undefined;
  emojis: AllEmojis | undefined;
  nativeToName: Record<string, string> | undefined ;
};

export const useEmojiData = ({ hideRecent, recentEmojis }: UseEmojiDataArgs) => {
  const [data, setData] = useState<UseEmojiDataStored>({
    categories: undefined,
    emojis: undefined,
    nativeToName: undefined,
  });

  const lang = useLang();

  // Initialize data on first render.
  useEffect(() => {
    setTimeout(() => {
      const exec = () => {
        setData({
          categories: emojiData.categories,
          emojis: emojiData.emojis as AllEmojis,
          nativeToName: emojiData.nativeToName,
        });
      };

      if (emojiData) {
        exec();
      } else {
        ensureEmojiData()
          .then(exec);
      }
    }, OPEN_ANIMATION_DELAY);
  }, []);

  const allCategories = useMemo(() => {
    if (!data.categories) {
      return MEMO_EMPTY_ARRAY;
    }
    const themeCategories = [...data.categories];
    if (!hideRecent && recentEmojis?.length) {
      themeCategories.unshift({
        id: RECENT_SYMBOL_SET_ID,
        name: lang('RecentStickers'),
        emojis: recentEmojis,
      });
    }

    return themeCategories;
  }, [hideRecent, data.categories, lang, recentEmojis]);

  return { emojis: data.emojis, allCategories, nativeToName: data.nativeToName };
};
