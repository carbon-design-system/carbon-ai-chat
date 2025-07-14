/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";
import { FormattedMessage } from "react-intl";

import { isNil } from "../../utils/lang/langUtils";
import { addHTMLSupport } from "../../utils/languages";
import RichText from "../responseTypes/util/RichText";
import { AgentAvailability } from "../../../../types/config/ServiceDeskConfig";
import { EnglishLanguagePack } from "../../../../types/instance/apiTypes";

interface AvailabilityMessageProps {
  availability: AgentAvailability;
  fallbackText: string;
}

/**
 * Returns the details necessary for building the message to display the current agent availability.
 */
function AvailabilityMessage({
  availability,
  fallbackText,
}: AvailabilityMessageProps) {
  let availabilityKey: keyof EnglishLanguagePack;
  let availabilityValues: Record<string, any>;
  let availabilityText: string;
  if (!isNil(availability?.estimated_wait_time)) {
    availabilityKey = "agent_connectingMinutes";
    availabilityValues = { time: availability.estimated_wait_time };
  } else if (!isNil(availability?.position_in_queue)) {
    availabilityKey = "agent_connectingQueue";
    availabilityValues = { position: availability.position_in_queue };
  } else if (availability?.message) {
    availabilityText = availability.message;
  } else {
    availabilityText = fallbackText;
  }

  if (availabilityText) {
    return <RichText overrideSanitize text={availabilityText} />;
  }
  return (
    <FormattedMessage
      id={availabilityKey}
      values={addHTMLSupport(availabilityValues)}
    />
  );
}

export { AvailabilityMessage };
