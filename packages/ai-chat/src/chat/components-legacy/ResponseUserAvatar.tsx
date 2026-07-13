/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Displays an image for a human agent's avatar or a default icon if no image is available.
 */

import UserAvatar32 from "@carbon/icons/es/user--avatar/32.js";
import { carbonIconToReact } from "../utils/carbonIcon";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

import { ResponseUserProfile } from "../../types/messaging/Messages";
import { applyDynamicStyles, clearDynamicStyles } from "../utils/cspStyleUtils";
import { useSelector } from "../hooks/useSelector";
import { AppState } from "../../types/state/AppState";

interface ResponseUserAvatarProps {
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

const UserAvatar = carbonIconToReact(UserAvatar32);

function ResponseUserAvatar(props: ResponseUserAvatarProps) {
  const { responseUserProfile, width, height } = props;
  // Subscribe only to the single string this avatar renders, so it re-renders
  // only when that string changes — not on any language-pack edit.
  const agentAriaHumanAgentAvatar = useSelector(
    (state: AppState) => state.languagePack.agent_ariaHumanAgentAvatar,
  );
  const agentName = responseUserProfile?.nickname;
  const avatarUrl = responseUserProfile?.profile_picture_url;
  // Indicates if the avatar for a human agent failed to load.
  const [hasError, setHasError] = useState(false);
  let component;

  const avatarRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const node = avatarRef.current;
    if (!node || !width || !height) {
      return undefined;
    }
    applyDynamicStyles(node, "avatar", {
      "inline-size": width,
      "block-size": height,
    });
    return () => clearDynamicStyles(node, "avatar");
  }, [width, height]);

  // If the avatar Url changes, then hasError should reset to allow an attempt at loading the new avatar url.
  useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  if (!hasError && avatarUrl) {
    component = (
      <img
        src={avatarUrl}
        alt={agentAriaHumanAgentAvatar}
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
        aria-label={agentAriaHumanAgentAvatar}
        className="cds-aichat--response-user-avatar__circle"
        ref={avatarRef}
      >
        <div className="cds-aichat--response-user-avatar__letter">
          {agentName.charAt(0)}
        </div>
      </div>
    );
  } else {
    // If the agentName contains any non-ASCII characters, then show the default agent avatar.
    component = (
      <UserAvatar
        width={width ? Number(width.replace("px", "")) : undefined}
        height={height ? Number(height.replace("px", "")) : undefined}
        aria-label={agentAriaHumanAgentAvatar}
      />
    );
  }

  return <div className="cds-aichat--response-user-avatar">{component}</div>;
}

export { ResponseUserAvatar };
