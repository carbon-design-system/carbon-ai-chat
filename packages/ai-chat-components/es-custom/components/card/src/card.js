/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { __decorate } from 'tslib';
import { property } from 'lit/decorators.js';
import CDSTile from '@carbon/web-components/es-custom/components/tile/tile.js';
import styles from './card.scss.js';
import { html } from 'lit';
import { carbonElement } from '../../../globals/decorators/carbon-element.js';

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
 */
let Card = class Card extends CDSTile {
    constructor() {
        super(...arguments);
        /**
         * Specify whether the `Card` layering style. if true, the card will follow carbon layering style, otherwise chat shell layering style.
         */
        this.isLayered = false;
        /**
         * Specify whether the padding should be removed from the card. default is true.
         * This is useful when the card is used as a container for other components
         * and you want to remove the default padding from cds-custom-tile.
         */
        this.isFlush = true;
    }
    render() {
        return html `
      <div ?data-flush=${this.isFlush}>
        <slot name="header"></slot>
        <slot name="media"></slot>
        <slot name="body"></slot>
        <slot name="footer"></slot>
        <slot name="decorator"></slot>
      </div>
    `;
    }
};
Card.styles = styles;
__decorate([
    property({ type: Boolean, attribute: "is-layered", reflect: true })
], Card.prototype, "isLayered", void 0);
__decorate([
    property({ type: Boolean, attribute: "is-flush", reflect: true })
], Card.prototype, "isFlush", void 0);
Card = __decorate([
    carbonElement("cds-aichat-card")
], Card);
var CDSAIChatCard = Card;

export { CDSAIChatCard as default };
//# sourceMappingURL=card.js.map
