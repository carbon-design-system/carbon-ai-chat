/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Displays an image for a human agent's avatar or a default icon if no image is available.
 */

import UserAvatar from "@carbon/icons-react/es/UserAvatar.js";
import React, { useEffect, useState, useLayoutEffect, useRef } from "react";

import HasLanguagePack from "../../../types/utilities/HasLanguagePack";
import { ResponseUserProfile } from "../../../types/messaging/Messages";

interface ResponseUserAvatarProps extends HasLanguagePack {
  /**
   * Profile information about a specific agent.
   */
  responseUserProfile: ResponseUserProfile;

  /**
   * The width of the avatar.
   */
  width?: string;

  /**
   * The height of the avatar.
   */
  height?: string;
}

function ResponseUserAvatar(props: ResponseUserAvatarProps) {
  const { responseUserProfile, languagePack, width, height } = props;
  const agentName = responseUserProfile?.nickname;
  const avatarUrl = responseUserProfile?.profile_picture_url;
  // Indicates if the avatar for a human agent failed to load.
  const [hasError, setHasError] = useState(false);
  let component;

  const avatarRef = useRef<HTMLDivElement>(null);

  // If the avatar Url changes, then hasError should reset to allow an attempt at loading the new avatar url.
  useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  // set the width and height of avatar if agentName only contains ASCII characters
  useLayoutEffect(() => {
    if (avatarRef && width && height) {
      avatarRef.current.style.setProperty("inline-size", width);
      avatarRef.current.style.setProperty("block-size", height);
    }
  }, [width, height]);

  if (!hasError && avatarUrl) {
    component = (
      <img
        src={avatarUrl}
        alt={languagePack.agent_ariaResponseUserAvatar}
        onError={() => setHasError(true)}
      />
    );
  } else if (agentName?.match(/^[\x20-\xFE]+$/)) {
    // If the agentName only contains ASCII characters (and at least one), then show the first letter of the agentName
    // as the agentAvatar. For most Latin languages, we can infer that the first letter of the name is an appropriate
    // representation for that person. For other languages such as Chinese, it's not clear what the correct letter
    // would be so if we see any such characters at all, we'll just fall back to showing a picture instead of a letter.
    // We're only accepting ASCII (and extended ASCII) because proper browser detection for Latin characters is lacking.
    component = (
      <div
        aria-label={languagePack.agent_ariaResponseUserAvatar}
        className="WACResponseUserAvatar__Circle"
        ref={avatarRef}
      >
        <div className="WACResponseUserAvatar__Letter">
          {agentName.charAt(0)}
        </div>
      </div>
    );
  } else {
    // If the agentName contains any non-ASCII characters, then show the default agent avatar.
    component = (
      <UserAvatar
        size={32}
        width={width ? Number(width.replace("px", "")) : undefined}
        height={height ? Number(height.replace("px", "")) : undefined}
        aria-label={languagePack.agent_ariaResponseUserAvatar}
      />
    );
  }

  return <div className="WACResponseUserAvatar">{component}</div>;
}

export { ResponseUserAvatar };
