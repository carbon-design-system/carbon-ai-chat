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
import { carbonElement } from '../../../globals/decorators/index.js';
import prefix from '../../../globals/settings.js';
import commonStyles from '../../../globals/scss/common.scss?lit';
import styles from './chat-button.scss?lit';
import type { ChatButtonSize } from './chat-button.js';

/**
 * Component extending the @carbon/web-components' button skeleton
 *
 * @element cds-aichat-button-skeleton
 */
@carbonElement(`${prefix}-button-skeleton`)
class CDSAIChatButtonSkeleton extends CDSButtonSkeleton {
  static styles = [commonStyles, styles];

  /**
   * Button size.
   * Options: "sm", "md", "lg".
   */
  @property({ reflect: true, attribute: 'size' })
  declare size: ChatButtonSize;
}

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-button-skeleton': CDSAIChatButtonSkeleton;
  }
}

export { CDSAIChatButtonSkeleton };
export default CDSAIChatButtonSkeleton;
