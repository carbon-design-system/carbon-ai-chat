/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import CDSButton from "@carbon/web-components/es/components/button/button.js";
// @ts-ignore
import styles from "./chat-button.scss?lit";

/**
 * Component extending the @carbon/web-components' button
 */
class chatButton extends CDSButton {
  static styles = styles;
}

export default chatButton;
