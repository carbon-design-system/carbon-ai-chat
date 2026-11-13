/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, fixture, expect } from '@open-wc/testing';
import '@carbon/ai-chat-components/es/components/feedback/index.js';
import FeedbackButtons from '@carbon/ai-chat-components/es/components/feedback/src/feedback-buttons.js';

function thumbsButtons(el: FeedbackButtons): Element[] {
  return Array.from(el.shadowRoot!.querySelectorAll('cds-icon-button'));
}

describe('feedback buttons', function () {
  it('gives neither thumbs button aria-controls, even with a panel ID', async () => {
    const el = await fixture<FeedbackButtons>(
      html`<cds-aichat-feedback-buttons
        panel-id="feedback-panel"
        has-positive-details
        has-negative-details
        is-negative-open></cds-aichat-feedback-buttons>`
    );
    const buttons = thumbsButtons(el);
    expect(buttons).to.have.length(2);
    for (const button of buttons) {
      expect(button.hasAttribute('aria-controls')).to.equal(false);
    }
  });

  it('marks each thumbs button that has details as expanded or collapsed', async () => {
    const el = await fixture<FeedbackButtons>(
      html`<cds-aichat-feedback-buttons
        panel-id="feedback-panel"
        has-positive-details
        has-negative-details
        is-negative-open></cds-aichat-feedback-buttons>`
    );
    const [positive, negative] = thumbsButtons(el);
    expect(positive.getAttribute('aria-expanded')).to.equal('false');
    expect(negative.getAttribute('aria-expanded')).to.equal('true');
  });

  it('leaves aria-expanded off a thumbs button with no details', async () => {
    const el = await fixture<FeedbackButtons>(
      html`<cds-aichat-feedback-buttons
        has-negative-details></cds-aichat-feedback-buttons>`
    );
    const [positive, negative] = thumbsButtons(el);
    expect(positive.hasAttribute('aria-expanded')).to.equal(false);
    expect(negative.getAttribute('aria-expanded')).to.equal('false');
  });
});
