/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import { HasBaseHeight } from "../../../../../types/utilities/HasBaseHeight";
import { MediaPlayer, MediaPlayerContentConfig } from "../util/MediaPlayer";
import { MessageResponseTypes } from "../../../../../types/messaging/Messages";

type VideoComponentConfig = HasBaseHeight;

type VideoComponentProps = MediaPlayerContentConfig & VideoComponentConfig;

function VideoComponent({ ...props }: VideoComponentProps) {
  return <MediaPlayer type={MessageResponseTypes.VIDEO} {...props} />;
}

const VideoComponentExport = React.memo(VideoComponent);

export { VideoComponentConfig, VideoComponentExport as VideoComponent };
