/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { css } from 'lit';

var styles = css([":host{background-color:transparent;border:0;border-radius:0;color:var(--cds-custom-text-helper,#6f6f6f);display:block}:host([hidden]){display:none}.cds-aichat__panel--hidden{display:none}.cds-aichat--reasoning-step{inline-size:100%}.cds-aichat--reasoning-step__trigger{align-items:center;background:transparent;border:0;color:var(--cds-custom-text-helper,#6f6f6f);cursor:pointer;display:flex;font:inherit;gap:.25rem;inline-size:100%;padding:0;text-align:start}.cds-aichat--reasoning-step__trigger:focus-visible{outline:2px solid var(--cds-custom-focus,#0f62fe);outline-offset:2px}.cds-aichat--reasoning-step__icon{align-items:center;block-size:1rem;display:inline-flex;inline-size:1rem;justify-content:center;transition:transform .24s cubic-bezier(.2,0,.38,.9)}.cds-aichat--reasoning-step__icon svg{fill:currentColor;block-size:100%;inline-size:100%}:host([open]) .cds-aichat--reasoning-step__icon{transform:rotate(90deg)}.cds-aichat--reasoning-step__title{color:var(--cds-custom-text-helper,#6f6f6f);flex:1;font-size:var(--cds-custom-heading-01-font-size,.875rem);font-weight:var(--cds-custom-heading-01-font-weight,600);letter-spacing:var(--cds-custom-heading-01-letter-spacing,.16px);line-height:var(--cds-custom-heading-01-line-height,1.42857)}.cds-aichat--reasoning-step__static{align-items:center;display:flex;gap:.25rem}.cds-aichat--reasoning-step__static-icon{align-items:center;block-size:1rem;display:inline-flex;inline-size:1rem;justify-content:center}.cds-aichat--reasoning-step__static-icon svg{fill:currentColor;block-size:100%;inline-size:100%}.cds-aichat--reasoning-step__panel{display:grid;grid-template-rows:0fr;opacity:0;padding-block-end:0;padding-block-start:0;padding-inline:1.25rem;pointer-events:none;transition:grid-template-rows .11s cubic-bezier(0,0,.38,.9),opacity .11s cubic-bezier(0,0,.38,.9),padding-block-end .11s cubic-bezier(0,0,.38,.9)}.cds-aichat--reasoning-step__panel[hidden]{display:none}:host([open]) .cds-aichat--reasoning-step__panel{grid-template-rows:1fr;opacity:1;padding-block-end:.25rem;padding-block-start:.125rem;pointer-events:auto}.cds-aichat--reasoning-step__panel-body{min-block-size:0;overflow:hidden}"]);

export { styles as default };
//# sourceMappingURL=reasoning-step.scss.js.map
