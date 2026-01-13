/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { __decorate } from 'tslib';
import { property } from 'lit/decorators.js';
import { CHAT_BUTTON_SIZE } from '../defs.js';
import CarbonButtonElement, { BUTTON_KIND } from '@carbon/web-components/es-custom/components/button/button.js';
export { BUTTON_KIND as CHAT_BUTTON_KIND, BUTTON_TYPE as CHAT_BUTTON_TOOLTIP_ALIGNMENT, BUTTON_TYPE as CHAT_BUTTON_TOOLTIP_POSITION, BUTTON_TYPE as CHAT_BUTTON_TYPE } from '@carbon/web-components/es-custom/components/button/button.js';
import { carbonElement } from '../../../globals/decorators/carbon-element.js';
import styles from './chat-button.scss.js';

/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * Component extending the @carbon/web-components' button
 *
 * @element cds-aichat-button
 */
let CDSAIChatButton = class CDSAIChatButton extends CarbonButtonElement {
    constructor() {
        super(...arguments);
        /**
         * Specify whether the `ChatButton` should be rendered as a quick action button
         */
        this.isQuickAction = false;
        /**
         * @internal
         */
        this.allowedSizes = [
            CHAT_BUTTON_SIZE.SMALL,
            CHAT_BUTTON_SIZE.MEDIUM,
            CHAT_BUTTON_SIZE.LARGE,
        ];
    }
    willUpdate(changedProps) {
        if (changedProps.has("isQuickAction") || changedProps.has("size")) {
            this._normalizeButtonState();
        }
    }
    _normalizeButtonState() {
        if (this.isQuickAction) {
            this.kind = BUTTON_KIND.GHOST;
            this.size = CHAT_BUTTON_SIZE.SMALL;
            return;
        }
        // Do not allow size larger than `lg`
        if (!this.allowedSizes.includes(this.size)) {
            this.size = CHAT_BUTTON_SIZE.LARGE;
        }
        if (!Object.values(BUTTON_KIND).includes(this.kind)) {
            this.kind = BUTTON_KIND.PRIMARY;
        }
    }
};
CDSAIChatButton.styles = styles;
__decorate([
    property({ type: Boolean, attribute: "is-quick-action" })
], CDSAIChatButton.prototype, "isQuickAction", void 0);
__decorate([
    property({ reflect: true, attribute: "size" })
], CDSAIChatButton.prototype, "size", void 0);
CDSAIChatButton = __decorate([
    carbonElement("cds-aichat-button")
], CDSAIChatButton);
var AIChatButton = CDSAIChatButton;

export { CDSAIChatButton, CHAT_BUTTON_SIZE, AIChatButton as default };
//# sourceMappingURL=chat-button.js.map
