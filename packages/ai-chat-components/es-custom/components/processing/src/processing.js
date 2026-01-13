/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { __decorate } from 'tslib';
import { LitElement, html } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import styles from './processing.scss.js';
import { carbonElement } from '../../../globals/decorators/carbon-element.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
let CDSAIChatProcessing = class CDSAIChatProcessing extends LitElement {
    constructor() {
        super(...arguments);
        /** Enables the linear looping animation variant. */
        this.loop = false;
        /** Enables the quick-load animation variant. */
        this.quickLoad = false;
    }
    render() {
        const classes = classMap({
            [`quick-load`]: this.quickLoad === true,
            [`linear`]: this.loop === true,
            [`linear--no-loop`]: this.loop === false,
        });
        return html `<div class=${classes}>
      <svg class="dots" viewBox="0 0 32 32">
        <circle class="dot dot--left" cx="8" cy="16" />
        <circle class="dot dot--center" cx="16" cy="16" r="2" />
        <circle class="dot dot--right" cx="24" cy="16" r="2" />
      </svg>
    </div>`;
    }
};
CDSAIChatProcessing.styles = styles;
__decorate([
    property({ type: Boolean, attribute: "loop" })
], CDSAIChatProcessing.prototype, "loop", void 0);
__decorate([
    property({ type: Boolean, attribute: "quick-load" })
], CDSAIChatProcessing.prototype, "quickLoad", void 0);
CDSAIChatProcessing = __decorate([
    carbonElement("cds-aichat-processing")
], CDSAIChatProcessing);
var CDSAIChatProcessing$1 = CDSAIChatProcessing;

export { CDSAIChatProcessing, CDSAIChatProcessing$1 as default };
//# sourceMappingURL=processing.js.map
