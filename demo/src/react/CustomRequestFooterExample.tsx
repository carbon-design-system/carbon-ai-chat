/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useEffect, useRef, useState } from 'react';
import { MessageRequest } from '@carbon/ai-chat';
import { CopyButton } from '@carbon/react';

interface CustomRequestFooterExampleProps {
  message: MessageRequest;
}

const FEEDBACK_TIMEOUT = 2000;

function CustomRequestFooterExample({
  message,
}: CustomRequestFooterExampleProps) {
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
    navigator.clipboard.writeText(text);
    setStatus('Copied');
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setStatus(''), FEEDBACK_TIMEOUT);
  };

  // Carbon's CopyButton swaps its own label rather than announcing through a
  // live region, so the status element is what a screen reader reports.
  return (
    <div>
      <CopyButton
        feedback="Copied"
        feedbackTimeout={FEEDBACK_TIMEOUT}
        iconDescription="Copy your message"
        onClick={handleCopy}
      />
      <span className="visually-hidden" role="status">
        {status}
      </span>
    </div>
  );
}

export { CustomRequestFooterExample };
