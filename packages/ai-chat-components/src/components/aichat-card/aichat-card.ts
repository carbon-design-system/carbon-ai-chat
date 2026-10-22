/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { property } from 'lit/decorators.js';
import CDSTile from '@carbon/web-components/es/components/tile/tile.js';
import commonStyles from '../../globals/scss/common.scss?lit';
import styles from './aichat-card.scss?lit';
import { html } from 'lit';
import { prefix } from '../../globals/settings.js';

/**
 * Component extending the @carbon/web-components' button
 * @element cds-aichat-card
 * @slot header - Card header content.
 * @slot media - Media shown before the body.
 * @slot body - Main card content.
 * @slot footer - Footer actions and supporting content.
 * @slot decorator - Decorative content such as an AI label.
 */
class Card extends CDSTile {
  static get is() {
    return `${prefix}-aichat-card`;
  }

  static styles = [commonStyles, styles];

  /**
   * Specify whether the `Card` layering style. if true, the card will follow carbon layering style, otherwise chat shell layering style.
   */
  @property({ type: Boolean, attribute: 'is-layered', reflect: true })
  isLayered = false;

  /**
   * Specify whether the padding should be removed from the card. default is false.
   * When true, removes the default padding from cds-tile, useful when the card
   * is used as a container for other components that need to be flush against edges.
   */
  @property({ type: Boolean, attribute: 'is-flush', reflect: true })
  isFlush = false;

  render() {
    return html`
      <slot name="header"></slot>
      <slot name="media"></slot>
      <slot name="body"></slot>
      <slot name="footer"></slot>
      <slot name="decorator"></slot>
    `;
  }
}

export default Card;
