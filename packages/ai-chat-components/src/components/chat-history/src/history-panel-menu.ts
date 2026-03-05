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
import CDSSideNavMenu from "@carbon/web-components/es/components/ui-shell/side-nav-menu.js";

import styles from "./chat-history.scss?lit";

/**
 * Chat History panel menu.
 *
 * @element cds-aichat-history-panel-menu
 *
 */
@carbonElement(`${prefix}-history-panel-menu`)
class CDSAIChatHistoryPanelMenu extends CDSSideNavMenu {
  static styles = styles;
}

export { CDSAIChatHistoryPanelMenu };
export default CDSAIChatHistoryPanelMenu;
