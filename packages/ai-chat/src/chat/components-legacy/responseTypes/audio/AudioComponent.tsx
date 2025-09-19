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

interface AudioComponentConfig {
  /**
   * Determines if the source loads a Mixcloud player.
   */
  isMixcloud: boolean;
}

type AudioComponentProps = MediaPlayerContentConfig;

function AudioComponent({ source, ...props }: AudioComponentProps) {
  // Determine if the provided source is a Mixcloud link in order to set a fixed height it uses.
  const isMixCloud = source?.startsWith("https://www.mixcloud.com");
  return (
    <MediaPlayer
      type={MessageResponseTypes.AUDIO}
      source={source}
      isMixcloud={isMixCloud}
      {...props}
    />
  );
}

const AudioComponentExport = React.memo(AudioComponent);

export { AudioComponentConfig, AudioComponentExport as AudioComponent };
