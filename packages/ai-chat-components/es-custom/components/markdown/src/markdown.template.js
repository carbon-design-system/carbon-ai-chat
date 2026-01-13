/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
function markdownTemplate({ slotRef, onSlotChange, renderedContent, }) {
    return html `
    <div class="cds-aichat-markdown-stack">${renderedContent}</div>
    <div hidden>
      <slot ${ref(slotRef)} @slotchange=${onSlotChange}></slot>
    </div>
  `;
}

export { markdownTemplate };
//# sourceMappingURL=markdown.template.js.map
