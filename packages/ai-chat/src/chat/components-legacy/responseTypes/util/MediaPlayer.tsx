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
import { Transcript } from "@carbon/ai-chat-components/es/react/transcript.js";
import React from "react";

import { useLanguagePack } from "../../../hooks/useLanguagePack";
import { VideoComponentConfig } from "../video/VideoComponent";
import { MessageResponseTypes } from "../../../../types/messaging/Messages";
import Card from "@carbon/ai-chat-components/es/react/card.js";
import { TextHolderTile } from "./TextHolderTile";

/**
 * The parent interface for the different media player types (audio, video) which holds the common properties between
 * them.
 */
interface MediaPlayerContentConfig {
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
  extends MediaPlayerContentConfig, Partial<VideoComponentConfig> {
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
  baseHeight,
  playing,
  onPlay,
  onPause,
  hideIconAndTitle,
  subtitle_tracks,
  transcript,
}: MediaPlayerProps) {
  const {
    errors_audioSource,
    errors_videoSource,
    media_transcript_label,
    media_transcript_show,
    media_transcript_hide,
    media_audioPlayer_loading,
    media_audioPlayer_ready,
    media_audioPlayer_loadingLabel,
    media_audioPlayer_readyLabel,
    media_audioPlayer_errorLabel,
    media_videoPlayer_loading,
    media_videoPlayer_ready,
    media_videoPlayer_loadingLabel,
    media_videoPlayer_readyLabel,
    media_videoPlayer_errorLabel,
  } = useLanguagePack();

  const isAudio = type === MessageResponseTypes.AUDIO;
  const errorMessage = isAudio ? errors_audioSource : errors_videoSource;

  // Calculate aspect ratio percentage from baseHeight for video
  // baseHeight is typically 56.25 for 16:9 video
  // Audio player uses a fixed height and doesn't need aspectRatioPercentage
  const aspectRatioPercentage = isAudio ? undefined : baseHeight || 56.25;

  return (
    <div className="cds-aichat--media-player__root">
      {isAudio && (
        <Card isFlush>
          <div slot="media">
            <AudioPlayer
              data-rounded="top"
              source={source}
              title={!hideIconAndTitle ? title : undefined}
              description={description}
              ariaLabel={ariaLabel || description || title}
              playing={playing}
              errorMessage={errorMessage}
              loadingStatusMessage={media_audioPlayer_loading}
              readyStatusMessage={media_audioPlayer_ready}
              loadingLabel={media_audioPlayer_loadingLabel}
              readyLabel={media_audioPlayer_readyLabel}
              errorLabel={media_audioPlayer_errorLabel}
              onPlay={onPlay}
              onPause={onPause}
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
            {transcript && (
              <Transcript
                text={transcript.text}
                label={transcript.label || media_transcript_label}
                language={transcript.language}
                show-label={media_transcript_show}
                hide-label={media_transcript_hide}
              />
            )}
          </div>
        </Card>
      )}
      {!isAudio && (
        <Card isFlush>
          <div slot="media">
            <VideoPlayer
              data-rounded="top"
              source={source}
              title={!hideIconAndTitle ? title : undefined}
              description={description}
              ariaLabel={ariaLabel || description || title}
              playing={playing}
              aspectRatioPercentage={aspectRatioPercentage}
              subtitleTracks={subtitle_tracks}
              errorMessage={errorMessage}
              loadingStatusMessage={media_videoPlayer_loading}
              readyStatusMessage={media_videoPlayer_ready}
              loadingLabel={media_videoPlayer_loadingLabel}
              readyLabel={media_videoPlayer_readyLabel}
              errorLabel={media_videoPlayer_errorLabel}
              onPlay={onPlay}
              onPause={onPause}
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
