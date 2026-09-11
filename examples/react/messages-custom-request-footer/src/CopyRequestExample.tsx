/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Copy button for the messages-custom-request-footer example.
 *
 * Demonstrates: a footer rendered beneath a user message. It reads the text the
 * user submitted from `message.input.text` and copies it, so someone can reuse
 * or edit an earlier request.
 *
 * Carbon's `CopyButton` carries the accessible name and the visible "Copied"
 * feedback, but it swaps its own label rather than announcing through a live
 * region. The `role="status"` element below is what a screen reader reports, so
 * the confirmation is not sighted-only.
 *
 * Rendered by: the `renderCustomRequestFooter` render prop in `./App.tsx`.
 */

import { MessageRequest } from '@carbon/ai-chat';
import { CopyButton } from '@carbon/react';
import React, { useEffect, useRef, useState } from 'react';

interface CopyRequestExampleProps {
  message: MessageRequest;
}

const FEEDBACK_TIMEOUT = 2000;

function CopyRequestExample({ message }: CopyRequestExampleProps) {
  const [status, setStatus] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const text = message.input.text;

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  // A message can arrive with no text — an upload, for instance — and there is
  // nothing to copy then. Guarding here also narrows `text` to a string.
  if (!text) {
    return null;
  }

  const handleCopy = () => {
    // navigator.clipboard needs a secure context. localhost counts as one, so
    // this works in development; behind plain HTTP it does not.
    navigator.clipboard.writeText(text);
    setStatus('Copied');
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setStatus(''), FEEDBACK_TIMEOUT);
  };

  return (
    <div className="custom-request-footer-actions">
      <CopyButton
        feedback="Copied"
        feedbackTimeout={FEEDBACK_TIMEOUT}
        iconDescription="Copy your message"
        onClick={handleCopy}
      />
      <span className="custom-request-footer-status" role="status">
        {status}
      </span>
    </div>
  );
}

export { CopyRequestExample };
