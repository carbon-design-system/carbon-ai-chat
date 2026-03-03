/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Music32 from "@carbon/icons/es/music/32.js";
import { carbonIconToReact } from "../../../utils/carbonIcon";
import Card from "@carbon/ai-chat-components/es/react/card.js";
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
import { HasNeedsAnnouncement } from "../../../../types/utilities/HasNeedsAnnouncement";
import { RESPONSE_TYPE_TIMEOUT_MS } from "../../../utils/constants";
import { getResponsiveElementPaddingValue } from "../../../utils/miscUtils";
import {
  SkeletonPlaceholder,
  SkeletonText,
} from "../../../components/util/SkeletonPicker";
import { AudioComponentConfig } from "../audio/AudioComponent";
import InlineError from "../error/InlineError";
import { VideoComponentConfig } from "../video/VideoComponent";
import { TextHolderTile } from "./TextHolderTile";
import { TranscriptComponent } from "./TranscriptComponent";
import { MessageResponseTypes } from "../../../../types/messaging/Messages";
import type ReactPlayer from "react-player";
import { normalizeModuleInterop } from "../../../utils/moduleInterop";

// https://reactjs.org/docs/code-splitting.html#reactlazy
// Special handling for react-player due to CJS/ESM confusion
// react-player mixes CJS/ESM, so normalize the module before handing it to React.lazy.
const ReactPlayerComponent = React.lazy(async () => {
  const mod = await import("react-player/lazy/index.js");
  const exported = normalizeModuleInterop(mod);
  return { default: exported };
}) as React.LazyExoticComponent<typeof ReactPlayer>;

/**
 * The parent interface for the different media player types (audio, video) which holds the common properties between
 * them.
 */
interface MediaPlayerContentConfig extends HasNeedsAnnouncement {
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

  /**
   * Optional subtitle/caption tracks for video files.
   * Only applies to raw video files, not embedded platforms.
   */
  subtitle_tracks?: Array<{
    src: string;
    language: string;
    label: string;
    kind?: "subtitles" | "captions" | "descriptions";
    default?: boolean;
  }>;

  /**
   * Optional text transcript for audio files.
   * Only applies to raw audio files, not embedded platforms.
   */
  transcript?: {
    text: string;
    language?: string;
    label?: string;
  };
}

interface MediaPlayerProps
  extends
    MediaPlayerContentConfig,
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
 */
function MediaPlayerComponent({
  type,
  source,
  title,
  description,
  ariaLabel,
  isMixcloud,
  baseHeight,
  playing,
  onPlay,
  onPause,
  hideIconAndTitle,
  needsAnnouncement,
  subtitle_tracks,
  transcript,
}: MediaPlayerProps) {
  const [skeletonHidden, setSkeletonHidden] = useState(false);
  const [errorLoading, setErrorLoading] = useState(false);
  const { errors_audioSource, errors_videoSource } = useLanguagePack();
  const ariaAnnouncer = useAriaAnnouncer();
  const rootElementRef = useRef<HTMLDivElement>(undefined);
  const wrapperElementRef = useRef<HTMLDivElement>(null);
  const skeletonRef = useRef<HTMLDivElement>(null);

  const paddingTop = isMixcloud
    ? "120px"
    : getResponsiveElementPaddingValue(baseHeight);

  const isAudio = type === MessageResponseTypes.AUDIO;
  const Music = carbonIconToReact(Music32);
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
    }
  }, [skeletonHidden]);

  /**
   * Renders a media player skeleton. This is rendered until the react-player has loaded the provided url.
   */
  function renderMediaPlayerSkeleton() {
    return (
      <Card isFlush={true} className="cds-aichat--media-player__skeleton">
        <div slot="media">
          <div
            className="cds-aichat--media-player__skeleton-container"
            ref={skeletonRef}
          >
            <SkeletonPlaceholder className="cds-aichat--media-player__skeleton-player" />
          </div>
        </div>
        <div slot="body">
          {(title || description) && (
            <div className="cds-aichat--media-player__skeleton-text-container">
              <SkeletonText paragraph lineCount={2} />
            </div>
          )}
        </div>
      </Card>
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
        className={cx("cds-aichat--media-player__background", {
          "cds-aichat--media-player__background--audio": isAudio,
        })}
      >
        {isAudio && <Music className="cds-aichat--media-player__music-icon" />}
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
      <div className="cds-aichat--media-player__root" ref={rootElementRef}>
        {errorLoading && <InlineError text={errorMessage} />}
        {!errorLoading && (
          <Card
            isFlush={true}
            className={cx("cds-aichat--media-player", {
              "cds-aichat--hidden": !skeletonHidden,
            })}
          >
            <div slot="media">
              <div
                className="cds-aichat--media-player__wrapper"
                ref={wrapperElementRef}
              >
                {renderMediaPlayerBackground()}
                <Suspense fallback={renderSuspenseFallback()}>
                  <ReactPlayerComponent
                    className="cds-aichat--media-player__player"
                    url={source}
                    controls
                    width="100%"
                    height="100%"
                    config={{
                      file: {
                        forceVideo: type === MessageResponseTypes.VIDEO,
                        attributes: {
                          controlsList: "nodownload",
                          "aria-label": ariaLabel || description || title,
                          crossOrigin: "anonymous",
                        },
                        ...(type === MessageResponseTypes.VIDEO &&
                        subtitle_tracks &&
                        subtitle_tracks.length > 0
                          ? {
                              tracks: subtitle_tracks.map((track) => ({
                                kind: track.kind || "subtitles",
                                src: track.src,
                                srcLang: track.language,
                                label: track.label,
                                default: track.default || false,
                              })),
                            }
                          : {}),
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
            </div>
            <div slot="body">
              {(title || description) && (
                <TextHolderTile
                  title={title}
                  description={description}
                  hideTitle={hideIconAndTitle}
                />
              )}
              {type === MessageResponseTypes.AUDIO && transcript && (
                <TranscriptComponent
                  text={transcript.text}
                  label={transcript.label}
                  language={transcript.language}
                />
              )}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

const MediaPlayerExport = React.memo(MediaPlayerComponent);

export { MediaPlayerContentConfig, MediaPlayerExport as MediaPlayer };
