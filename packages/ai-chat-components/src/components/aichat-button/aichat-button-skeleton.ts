/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { property } from 'lit/decorators.js';
import CDSButtonSkeleton from '@carbon/web-components/es/components/button/button-skeleton.js';
import type CDSButton from '@carbon/web-components/es/components/button/button.js';
import { prefix } from '../../globals/settings.js';
import commonStyles from '../../globals/scss/common.scss?lit';
import styles from './aichat-button.scss?lit';
import type { ChatButtonSize } from './aichat-button.js';

/**
 * Component extending the @carbon/web-components' button skeleton
 *
 * @element cds-aichat-button-skeleton
 */
class CDSAIChatButtonSkeleton extends CDSButtonSkeleton {
  static get is() {
    return `${prefix}-aichat-button-skeleton`;
  }

  static styles = [commonStyles, styles];

  /**
   * Button size.
   * Options: "sm", "md", "lg".
   */
  @property({ reflect: true, attribute: 'size' })
  declare size: ChatButtonSize;
}

// Alpha.3's skeleton declaration imports its button ancestor without .js, so
// Node16 resolution loses the inherited HTMLElement and button properties.
interface CDSAIChatButtonSkeleton extends CDSButton {}

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-button-skeleton': CDSAIChatButtonSkeleton;
  }
}

export { CDSAIChatButtonSkeleton };
export default CDSAIChatButtonSkeleton;
