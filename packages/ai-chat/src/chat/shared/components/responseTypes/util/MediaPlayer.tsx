/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Music from "@carbon/icons-react/es/Music.js";
import { Tile } from "@carbon/react";
import cx from "classnames";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { useAriaAnnouncer } from "../../../hooks/useAriaAnnouncer";
import { useLanguagePack } from "../../../hooks/useLanguagePack";
import { usePrevious } from "../../../hooks/usePrevious";
import { HasDoAutoScroll } from "../../../../../types/utilities/HasDoAutoScroll";
import { HasNeedsAnnouncement } from "../../../../../types/utilities/HasNeedsAnnouncement";
import { RESPONSE_TYPE_TIMEOUT_MS } from "../../../utils/constants";
import { getResponsiveElementPaddingValue } from "../../../utils/miscUtils";
import { SkeletonPlaceholder, SkeletonText } from "../../SkeletonPicker";
import { AudioComponentConfig } from "../audio/AudioComponent";
import InlineError from "../error/InlineError";
import { VideoComponentConfig } from "../video/VideoComponent";
import { TextHolderTile } from "./TextHolderTile";
import { MessageResponseTypes } from "../../../../../types/messaging/Messages";
import type ReactPlayer from "react-player";

// https://reactjs.org/docs/code-splitting.html#reactlazy
// Special handling for react-player due to CJS/ESM confusion
const ReactPlayerComponent = React.lazy(() =>
  import("react-player/lazy/index.js").then((mod: any) => {
    // react-player 2.x is old and is confused in their cjs vs mjs usage.
    // mod might be:
    // { default: Component }
    // { default: { default: Component } }
    // plain Component
    let exported = mod.default ?? mod;
    if (exported && typeof exported === "object" && "default" in exported) {
      exported = exported.default;
    }
    return { default: exported };
  }),
) as React.LazyExoticComponent<typeof ReactPlayer>;

/**
 * The parent interface for the different media player types (audio, video) which holds the common properties between
 * them.
 */
interface MediaPlayerContentConfig
  extends HasDoAutoScroll,
    HasNeedsAnnouncement {
  /**
   * A url pointing to a video/audio file or a third-party video/audio service
   */
  source: string;

  /**
   * The title of the playable media.
   */
  title?: string;

  /**
   * A description of the playable media.
   */
  description?: string;

  /**
   * The aria-label to give the video element for accessibility purposes. Screen readers will announce this label when
   * user's virtual cursor is focused on the video element.
   */
  ariaLabel?: string;

  /**
   * Used to play and pause the media.
   */
  playing?: boolean;

  /**
   * Called when media starts or resumes playing after pausing or buffering.
   */
  onPlay?: () => void;

  /**
   * Called when media stops playing.
   */
  onPause?: () => void;

  /**
   * Indicates if the icon and title should be hidden.
   */
  hideIconAndTitle?: boolean;
}

interface MediaPlayerProps
  extends MediaPlayerContentConfig,
    Partial<VideoComponentConfig>,
    Partial<AudioComponentConfig> {
  /**
   * The type of media player that will determine how to render the player based on the url.
   */
  type: MessageResponseTypes.AUDIO | MessageResponseTypes.VIDEO;
}

/**
 * This component uses the React player library to handle rendering video/audio files, as well as handling third-party
 * embeddable video/audio services. Learn more: https://github.com/cookpete/react-player
 *
 * Note: We force media files to render using a video element for accessibility purposes since the audio element doesn't
 * support WebVTT for captioning/transcripts, but the video element does.
 * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio#accessibility_concerns
 */
function MediaPlayerComponent({
  type,
  source,
  title,
  description,
  ariaLabel,
  isMixcloud,
  baseHeight,
  doAutoScroll,
  playing,
  onPlay,
  onPause,
  hideIconAndTitle,
  needsAnnouncement,
}: MediaPlayerProps) {
  const [skeletonHidden, setSkeletonHidden] = useState(false);
  const [errorLoading, setErrorLoading] = useState(false);
  const { errors_audioSource, errors_videoSource } = useLanguagePack();
  const ariaAnnouncer = useAriaAnnouncer();
  const rootElementRef = useRef<HTMLDivElement>();
  const wrapperElementRef = useRef<HTMLDivElement>(null);
  const skeletonRef = useRef<HTMLDivElement>(null);

  const paddingTop = isMixcloud
    ? "120px"
    : getResponsiveElementPaddingValue(baseHeight);

  const isAudio = type === MessageResponseTypes.AUDIO;
  const errorMessage = isAudio ? errors_audioSource : errors_videoSource;
  const prevSource = usePrevious(source);
  // This ref is for merely saving the initial value of shouldAnnounce prop.
  const shouldAnnounceRef = useRef(needsAnnouncement);

  /**
   * Upon an error, update the error loading flag in order to render an inline error.
   */
  const handleError = useCallback(() => {
    setErrorLoading(true);
    setSkeletonHidden(true);
  }, []);

  useEffect(() => {
    if (source !== prevSource && skeletonHidden) {
      setSkeletonHidden(false);
    }
  }, [prevSource, skeletonHidden, source]);

  useLayoutEffect(() => {
    if (wrapperElementRef) {
      wrapperElementRef.current.style.setProperty(
        "padding-block-start",
        paddingTop,
      );
    }
    if (skeletonRef) {
      skeletonRef.current.style.setProperty("padding-block-start", paddingTop);
    }
  }, [paddingTop]);

  // This effect sets a timeout that auto error handles after 10 seconds of waiting for the React player to ready.
  // Once the player has loaded, the skeleton will be hidden, and we can clear the timeout.
  useEffect(() => {
    let errorTimeout: ReturnType<typeof setTimeout> = null;
    if (!skeletonHidden) {
      errorTimeout = setTimeout(handleError, RESPONSE_TYPE_TIMEOUT_MS);
    }

    return () => {
      clearTimeout(errorTimeout);
    };
  }, [skeletonHidden, handleError]);

  useEffect(() => {
    if (skeletonHidden && shouldAnnounceRef.current) {
      ariaAnnouncer(rootElementRef.current);
    }
  }, [ariaAnnouncer, skeletonHidden]);

  /**
   * Once the video player is finished loading, remove the skeleton.
   */
  const handleReady = useCallback(() => {
    if (!skeletonHidden) {
      setSkeletonHidden(true);
      doAutoScroll?.();
    }
  }, [doAutoScroll, skeletonHidden]);

  /**
   * Renders a media player skeleton. This is rendered until the react-player has loaded the provided url.
   */
  function renderMediaPlayerSkeleton() {
    return (
      <Tile className="WACMediaPlayer__Skeleton">
        <div className="WACMediaPlayer__SkeletonContainer" ref={skeletonRef}>
          <SkeletonPlaceholder className="WACMediaPlayer__SkeletonPlayer" />
        </div>
        {(title || description) && (
          <div className="WACMediaPlayer__SkeletonTextContainer">
            <SkeletonText paragraph lineCount={2} />
          </div>
        )}
      </Tile>
    );
  }

  /**
   * Render a media player background that adds letterboxes to urls utilizing iframes that may not have them included
   * already. If an audio file is being played, we should display a music icon in the center since audio files will be
   * loaded using a video element and a 16:9 blank video element with controls playing audio would look weird.
   */
  function renderMediaPlayerBackground() {
    return (
      <div
        className={cx("WACMediaPlayer__Background", {
          "WACMediaPlayer__Background--audio": isAudio,
        })}
      >
        {isAudio && <Music size={32} className="WACMediaPlayer__MusicIcon" />}
      </div>
    );
  }

  /**
   * If the dynamically imported react-player component is in suspense, we don't need to display some loading indicator
   * since the media player skeleton handles that for us and the media player is hidden with `display: none` until the
   * react-player has loaded the url.
   */
  function renderSuspenseFallback() {
    return <div></div>;
  }

  return (
    <>
      {!skeletonHidden && renderMediaPlayerSkeleton()}
      <div className="WACMediaPlayer__Root" ref={rootElementRef}>
        {errorLoading && <InlineError text={errorMessage} />}
        {!errorLoading && (
          <Tile
            className={cx("WACMediaPlayer", { WAC__hidden: !skeletonHidden })}
          >
            <div className="WACMediaPlayer__Wrapper" ref={wrapperElementRef}>
              {renderMediaPlayerBackground()}
              <Suspense fallback={renderSuspenseFallback()}>
                <ReactPlayerComponent
                  className="WACMediaPlayer__Player"
                  url={source}
                  controls
                  width="100%"
                  height="100%"
                  config={{
                    file: {
                      forceVideo: true,
                      attributes: {
                        controlsList: "nodownload",
                        "aria-label": ariaLabel || description || title,
                      },
                    },
                  }}
                  playsinline
                  playing={playing}
                  onPlay={onPlay}
                  onPause={onPause}
                  onReady={handleReady}
                  onError={handleError}
                  pip
                />
              </Suspense>
            </div>
            {(title || description) && (
              <TextHolderTile
                title={title}
                description={description}
                hideTitle={hideIconAndTitle}
              />
            )}
          </Tile>
        )}
      </div>
    </>
  );
}

const MediaPlayerExport = React.memo(MediaPlayerComponent);

export { MediaPlayerContentConfig, MediaPlayerExport as MediaPlayer };
