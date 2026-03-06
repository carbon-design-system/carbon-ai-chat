/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { VideoPlayer } from "@carbon/ai-chat-components/es/react/video-player.js";
import { AudioPlayer } from "@carbon/ai-chat-components/es/react/audio-player.js";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { useAriaAnnouncer } from "../../../hooks/useAriaAnnouncer";
import { useLanguagePack } from "../../../hooks/useLanguagePack";
import { usePrevious } from "../../../hooks/usePrevious";
import { HasNeedsAnnouncement } from "../../../../types/utilities/HasNeedsAnnouncement";
import { AudioComponentConfig } from "../audio/AudioComponent";
import InlineError from "../error/InlineError";
import { VideoComponentConfig } from "../video/VideoComponent";
import { MessageResponseTypes } from "../../../../types/messaging/Messages";
import Card from "@carbon/ai-chat-components/es/react/card";
import { TextHolderTile } from "./TextHolderTile";

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
 * This component uses custom video and audio player web components to handle rendering video/audio files,
 * as well as handling third-party embeddable video/audio services (YouTube, Vimeo, Kaltura, SoundCloud).
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
  const [playerReady, setPlayerReady] = useState(false);
  const [errorLoading, setErrorLoading] = useState(false);
  const { errors_audioSource, errors_videoSource } = useLanguagePack();
  const ariaAnnouncer = useAriaAnnouncer();
  const rootElementRef = useRef<HTMLDivElement>(undefined);
  const prevSource = usePrevious(source);
  // This ref is for merely saving the initial value of shouldAnnounce prop.
  const shouldAnnounceRef = useRef(needsAnnouncement);

  const isAudio = type === MessageResponseTypes.AUDIO;
  const errorMessage = isAudio ? errors_audioSource : errors_videoSource;

  // Calculate aspect ratio percentage from baseHeight
  // baseHeight is typically 56.25 for 16:9 video
  // For Mixcloud, we use a fixed height approach (handled by the component)
  const aspectRatioPercentage = isMixcloud ? undefined : baseHeight || 56.25;

  /**
   * Upon an error, update the error loading flag in order to render an inline error.
   */
  const handleError = useCallback(() => {
    setErrorLoading(true);
    setPlayerReady(true);
  }, []);

  /**
   * Reset state when source changes
   */
  useEffect(() => {
    if (source !== prevSource && playerReady) {
      setPlayerReady(false);
      setErrorLoading(false);
    }
  }, [prevSource, playerReady, source]);

  /**
   * Announce to screen readers when player is ready
   */
  useEffect(() => {
    if (playerReady && shouldAnnounceRef.current) {
      ariaAnnouncer(rootElementRef.current);
    }
  }, [ariaAnnouncer, playerReady]);

  /**
   * Once the media player is finished loading, mark as ready and trigger auto-scroll.
   */
  const handleReady = useCallback(() => {
    if (!playerReady) {
      setPlayerReady(true);
    }
  }, [playerReady]);

  return (
    <div className="cds-aichat--media-player__root" ref={rootElementRef}>
      {errorLoading && <InlineError text={errorMessage} />}
      {!errorLoading && isAudio && (
        <Card>
          <div slot="media">
            <AudioPlayer
              source={source}
              title={!hideIconAndTitle ? title : undefined}
              description={description}
              ariaLabel={ariaLabel || description || title}
              playing={playing}
              aspectRatioPercentage={aspectRatioPercentage}
              transcript={transcript}
              onPlay={onPlay}
              onPause={onPause}
              onReady={handleReady}
              onError={handleError}
            />
          </div>
          <div slot="body">
            {(title || description) && (
              <TextHolderTile
                title={title}
                description={description}
                hideTitle={hideIconAndTitle}
              />
            )}
          </div>
        </Card>
      )}
      {!errorLoading && !isAudio && (
        <Card>
          <div slot="media">
            <VideoPlayer
              source={source}
              title={!hideIconAndTitle ? title : undefined}
              description={description}
              ariaLabel={ariaLabel || description || title}
              playing={playing}
              aspectRatioPercentage={aspectRatioPercentage}
              subtitleTracks={subtitle_tracks}
              onPlay={onPlay}
              onPause={onPause}
              onReady={handleReady}
              onError={handleError}
            />
          </div>
          <div slot="body">
            {(title || description) && (
              <TextHolderTile
                title={title}
                description={description}
                hideTitle={hideIconAndTitle}
              />
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

const MediaPlayerExport = React.memo(MediaPlayerComponent);

export { MediaPlayerContentConfig, MediaPlayerExport as MediaPlayer };

// Made with Bob
