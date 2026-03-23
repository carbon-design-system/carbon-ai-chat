/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";
import IntlMessageFormat from "intl-messageformat";

import { useIntl } from "../../hooks/useIntl";
import { isNil } from "../../utils/lang/langUtils";
import { MarkdownWithDefaults } from "../../components/util/MarkdownWithDefaults";
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
  const { locale, messages } = useIntl();
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
      <MarkdownWithDefaults
        overrideSanitize
        text={availabilityText}
        highlight={true}
      />
    );
  }

  const message = messages[availabilityKey as string];
  const formatter = new IntlMessageFormat(message, locale);
  const formattedParts = formatter.format({
    ...availabilityValues,
    b: (chunks: any) => <b>{chunks}</b>,
    br: () => <br />,
  });

  // IntlMessageFormat returns an array when there are rich text elements
  return <span>{formattedParts}</span>;
}

export { AvailabilityMessage };
