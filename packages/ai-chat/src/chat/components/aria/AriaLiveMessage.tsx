/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useContext, useEffect } from "react";

import { AriaAnnouncerContext } from "../../contexts/AriaAnnouncerContext";

interface AriaLiveMessageProps {
  /**
   * The text of the message to announce.
   */
  message: string;
}

/**
 * This component acts as a wrapper around content that should be announced by a screen reader.
 */
function AriaLiveMessage(props: AriaLiveMessageProps) {
  const ariaAnnouncer = useContext(AriaAnnouncerContext);

  useEffect(() => {
    ariaAnnouncer(props.message);
  }, [ariaAnnouncer, props.message]);

  return <div />;
}

const AriaLiveMessageExport = React.memo(AriaLiveMessage);
export { AriaLiveMessageExport as AriaLiveMessage };
