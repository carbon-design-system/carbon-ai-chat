/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { prefix } from '../../globals/settings.js';
import CDSSideNavItems from '@carbon/web-components/es/components/ui-shell/side-nav-items.js';

import styles from './chat-history.scss?lit';

/**
 * Chat History panel items.
 *
 * @element cds-aichat-history-panel-items
 *
 */
class CDSAIChatHistoryPanelItems extends CDSSideNavItems {
  static get is() {
    return `${prefix}-aichat-history-panel-items`;
  }

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('data-floating-menu-container', '');
  }
}

export { CDSAIChatHistoryPanelItems };
export default CDSAIChatHistoryPanelItems;
