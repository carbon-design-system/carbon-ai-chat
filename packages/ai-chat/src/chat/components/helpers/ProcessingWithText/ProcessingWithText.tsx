/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cx from 'classnames';
import Processing from '@carbon/ai-chat-components/es/react/processing.js';
import React, { useEffect } from 'react';
import { useAriaAnnouncer } from '../../../hooks/useAriaAnnouncer';
import { CarbonTheme } from '../../../../types/config/CarbonTheme';

interface ProcessingWithTextProps {
  carbonTheme: CarbonTheme;
  index: number;
  isTypingMessage?: string;
  isVisible: boolean;
  processingLabel: string;
  statusMessage?: string;
}

function ProcessingWithText({
  carbonTheme,
  index,
  isTypingMessage,
  isVisible,
  processingLabel,
  statusMessage,
}: ProcessingWithTextProps) {
  const ariaAnnouncer = useAriaAnnouncer();

  useEffect(() => {
    if (ariaAnnouncer && isVisible && isTypingMessage) {
      ariaAnnouncer(isTypingMessage);
    }
  }, [ariaAnnouncer, isVisible, isTypingMessage]);

  return (
    <div
      className={cx(
        `cds-aichat--message cds-aichat--message-${index} cds-aichat--message--last-message`,
        { 'cds-aichat--typing-indicator--hidden': !isVisible }
      )}>
      <div className="cds-aichat--message--padding">
        <div className="cds-aichat--assistant-message">
          <div className="cds-aichat--received cds-aichat--received--loading cds-aichat--message-vertical-padding">
            <div className="cds-aichat--received--inner">
              <div className="cds-aichat--processing">
                <Processing
                  className="cds-aichat--processing-component"
                  loop
                  quickLoad
                  carbonTheme={carbonTheme}
                  aria-label={processingLabel}
                />{' '}
                <div className="cds-aichat--processing-label">
                  {statusMessage}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { ProcessingWithText };
