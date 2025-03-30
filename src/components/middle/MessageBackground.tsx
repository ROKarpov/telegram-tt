import React, {
  type FC, memo, useEffect, useRef,
} from '../../lib/teact/teact';
import { withGlobal } from '../../global';

import type { IThemeSettings, ThemeKey, ThreadId } from '../../types';
import type { Color } from '../../util/background-renderer/types';

import { selectTheme } from '../../global/selectors';
import { PatternBgRenderer } from '../../util/background-renderer/PatternBgRenderer';
import { hexToRgb } from '../../util/background-renderer/utils';
import buildClassName from '../../util/buildClassName';
import buildStyle from '../../util/buildStyle';
import { IS_ELECTRON } from '../../util/windowEnvironment';

import useCustomBackground from '../../hooks/useCustomBackground';

import './MessageBackground.scss';

type MessageBackgroundOwnProps = {
  renderingChatId: string | undefined;
  renderingThreadId: ThreadId | undefined;
  onMessageSentHandlerChanged: (handler: NoneToVoidFunction) => void;
};

type MessageBackgroundStateProps = {
  isRightColumnShown?: boolean;
  theme: ThemeKey;
  themeSettings: IThemeSettings;
};

type MessageBackgroundProps = MessageBackgroundOwnProps & MessageBackgroundStateProps;

const PatternMessageBackground: FC<Pick<MessageBackgroundProps, 'themeSettings' | 'onMessageSentHandlerChanged'>> = ({
  themeSettings,
  onMessageSentHandlerChanged,
}) => {
  // eslint-disable-next-line no-null/no-null
  const wrapperRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line no-null/no-null
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgRendererRef = useRef<PatternBgRenderer | undefined>(undefined);

  useEffect(() => {
    if (!(canvasRef.current && wrapperRef.current)) {
      return () => {
      };
    }

    const wrapperEl = wrapperRef.current;
    const canvasEl = canvasRef.current;

    if (!(bgRendererRef.current && bgRendererRef.current.canvas !== canvasEl)) {
      bgRendererRef.current = new PatternBgRenderer(canvasRef.current);
      onMessageSentHandlerChanged?.(() => bgRendererRef.current?.requestTransition());
    }

    const bgRenderer = bgRendererRef.current;
    bgRenderer.resize(
      window.devicePixelRatio * wrapperEl.clientWidth,
      window.devicePixelRatio * wrapperEl.clientHeight,
    );

    const handleResize = () => bgRenderer.resize(
      window.devicePixelRatio * wrapperEl.clientWidth,
      window.devicePixelRatio * wrapperEl.clientHeight,
    );
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [onMessageSentHandlerChanged]);

  useEffect(() => {
    if (!(bgRendererRef.current && themeSettings.backgroundColor && !themeSettings.background)) {
      return;
    }

    const colors = [
      themeSettings.backgroundColor,
      themeSettings.secondBackgroundColor,
      themeSettings.thirdBackgroundColor,
      themeSettings.fourthBackgroundColor,
    ].reduce((acc: Color[], color) => {
      if (color) {
        acc.push(hexToRgb(color));
      }
      return acc;
    }, []);

    bgRendererRef.current.changeWallpaper(
      themeSettings.pattern,
      // @ts-ignore
      colors,
      themeSettings.intensity ?? 100,
    )
      .catch((e: Error) => {
        // eslint-disable-next-line no-console
        console.error(e);
      });
  }, [
    themeSettings.background,
    themeSettings.pattern,
    themeSettings.intensity,
    themeSettings.backgroundColor,
    themeSettings.secondBackgroundColor,
    themeSettings.thirdBackgroundColor,
    themeSettings.fourthBackgroundColor,
  ]);

  return (
    <div
      ref={wrapperRef}
      key="pattern-bg-wrapper"
      className="pattern-message-background"
      style={buildStyle(`background-color: ${
        (themeSettings.intensity ?? 0) < 0
          ? '#000'
          : themeSettings.backgroundColor}`)}
    >
      <canvas ref={canvasRef} className="pattern-message-background-canvas" />
    </div>
  );
};

const MessageBackground: FC<MessageBackgroundProps> = ({
  renderingChatId,
  renderingThreadId,
  isRightColumnShown,
  theme,
  themeSettings,
  onMessageSentHandlerChanged,
}) => {
  const customBackgroundValue = useCustomBackground(theme, themeSettings.background);

  const bgClassName = buildClassName(
    'message-background',
    'with-transition',
    themeSettings.background && 'custom-bg-image',
    themeSettings.background && themeSettings.isBlurred && 'blurred',
    isRightColumnShown && 'with-right-column',
    IS_ELECTRON && !(renderingChatId && renderingThreadId) && 'draggable',
  );

  return customBackgroundValue ? (
    <div
      className={bgClassName}
      style={`--custom-background: ${customBackgroundValue}`}
    />
  ) : (
    <PatternMessageBackground
      themeSettings={themeSettings}
      onMessageSentHandlerChanged={onMessageSentHandlerChanged}
    />
  );
};

export default memo(withGlobal<MessageBackgroundOwnProps>(
  (global): MessageBackgroundStateProps => {
    const theme = selectTheme(global);
    const themeSettings = global.settings.themes[theme] || {};

    return {
      theme,
      themeSettings,
    };
  },
)(MessageBackground));
