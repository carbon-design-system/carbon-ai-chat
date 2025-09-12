/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import { useLanguagePack } from "../../hooks/useLanguagePack";

/**
 * This component is for displaying a message under streamed responses that were stopped.
 */
function ResponseStopped() {
  const { messages_responseStopped } = useLanguagePack();
  return (
    <div className="cds-aichat--response-stopped">
      {messages_responseStopped}
    </div>
  );
}

export { ResponseStopped };
