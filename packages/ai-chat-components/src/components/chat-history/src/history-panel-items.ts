/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import prefix from "../../../globals/settings.js";
import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import CDSSideNavItems from '@carbon/web-components/es/components/ui-shell/side-nav-items.js';

import styles from "./chat-history.scss?lit";

/**
 * Chat History panel items.
 *
 * @element cds-aichat-history-panel-items
 *
 */
@carbonElement(`${prefix}-history-panel-items`)
export class CDSHistoryPanelItems extends CDSSideNavItems{

  static styles = styles;
}

export default CDSHistoryPanelItems;
