/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import { MediaPlayer, MediaPlayerContentConfig } from "../util/MediaPlayer";
import { MessageResponseTypes } from "../../../../types/messaging/Messages";

type AudioComponentProps = MediaPlayerContentConfig;

function AudioComponent({ source, ...props }: AudioComponentProps) {
  return (
    <MediaPlayer type={MessageResponseTypes.AUDIO} source={source} {...props} />
  );
}

const AudioComponentExport = React.memo(AudioComponent);

export { AudioComponentExport as AudioComponent };
