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
import React, { useEffect, useState } from "react";

import HasLanguagePack from "../../../../types/utilities/HasLanguagePack";
import { AgentProfile } from "../../../../types/messaging/Messages";
import { useDynamicCSSProperties } from "../../hooks/useCSSCustomProperties";

interface AgentAvatarProps extends HasLanguagePack {
  /**
   * Profile information about a specific agent.
   */
  agentProfile: AgentProfile;

  /**
   * The width of the avatar.
   */
  width?: string;

  /**
   * The height of the avatar.
   */
  height?: string;
}

function AgentAvatar(props: AgentAvatarProps) {
  const { agentProfile, languagePack, width, height } = props;
  const agentName = agentProfile?.nickname;
  const avatarStyles = useDynamicCSSProperties({ width, height });
  const avatarUrl = agentProfile?.profile_picture_url;
  // Indicates if the avatar for a human agent failed to load.
  const [hasError, setHasError] = useState(false);
  let component;

  // If the avatar Url changes, then hasError should reset to allow an attempt at loading the new avatar url.
  useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  if (!hasError && avatarUrl) {
    component = (
      <img
        src={avatarUrl}
        alt={languagePack.agent_ariaAgentAvatar}
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
        aria-label={languagePack.agent_ariaAgentAvatar}
        className="WACAgentAvatar__Circle"
        // eslint-disable-next-line react/forbid-dom-props
        style={avatarStyles}
      >
        <div className="WACAgentAvatar__Letter">{agentName.charAt(0)}</div>
      </div>
    );
  } else {
    // If the agentName contains any non-ASCII characters, then show the default agent avatar.
    component = (
      <UserAvatar
        size={32}
        width={width ? Number(width.replace("px", "")) : undefined}
        height={height ? Number(height.replace("px", "")) : undefined}
        aria-label={languagePack.agent_ariaAgentAvatar}
      />
    );
  }

  return <div className="WACAgentAvatar">{component}</div>;
}

export { AgentAvatar };
