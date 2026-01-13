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
import RichText from "../responseTypes/util/RichText";
import { AgentAvailability } from "../../../types/config/ServiceDeskConfig";
import { LanguagePack } from "../../../types/config/PublicConfig";

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
  let availabilityKey: keyof LanguagePack;
  let availabilityValues: Record<string, any>;
  let availabilityText: string;
  if (!isNil(availability?.estimatedWaitTime)) {
    availabilityKey = "agent_connectingMinutes";
    availabilityValues = { time: availability.estimatedWaitTime };
  } else if (!isNil(availability?.positionInQueue)) {
    availabilityKey = "agent_connectingQueue";
    availabilityValues = { position: availability.positionInQueue };
  } else if (availability?.message) {
    availabilityText = availability.message;
  } else {
    availabilityText = fallbackText;
  }

  if (availabilityText) {
    return (
      <RichText overrideSanitize text={availabilityText} highlight={true} />
    );
  }
  return (
    <FormattedMessage
      id={availabilityKey as unknown as string}
      values={addHTMLSupport(availabilityValues)}
    />
  );
}

function addHTMLSupport(values: Record<string, any>) {
  values.b = handleBTag;
  values.br = handleBRTag;
  return values;
}

function handleBTag(chunks: any) {
  return <b>{chunks}</b>;
}

function handleBRTag() {
  return <br />;
}

export { AvailabilityMessage };
