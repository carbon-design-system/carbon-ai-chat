/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { iconLoader } from '@carbon/web-components/es/globals/internal/icon-loader.js';
import { type CarbonIcon } from '@carbon/web-components/es/globals/internal/icon-loader-utils.js';
import { carbonElement } from '../../../globals/decorators/index.js';
import prefix from '../../../globals/settings.js';
import commonStyles from '../../../globals/scss/common.scss?lit';
import styles from './system-message.scss?lit';

const blockClass = `${prefix}-system-message`;

/**
 * A status line between messages. The host sets `role="status"`, which
 * already announces changes politely, so the element adds no
 * `aria-live` attribute.
 *
 * @experimental
 * @element cds-aichat-system-message
 *
 * @slot - The text of the message.
 */
@carbonElement(blockClass)
class CDSAIChatSystemMessage extends LitElement {
  static styles = [commonStyles, styles];

  /**
   * If true, the message sits inside a message bubble, which owns the spacing,
   * so it adds no outer margin. By default the message sits on its own between
   * other messages and adds its own outer spacing.
   */
  @property({ type: Boolean, reflect: true })
  inline = false;

  /**
   * If true, draws a divider line above the message.
   */
  @property({ type: Boolean, reflect: true })
  divider = false;

  /**
   * If true, renders the "response stopped" indicator styling.
   */
  @property({ type: Boolean, reflect: true, attribute: 'response-stopped' })
  responseStopped = false;

  /**
   * An optional `@carbon/icons` icon shown before the text. The icon is
   * decorative, so the text must carry the meaning.
   */
  @property({ attribute: false })
  icon?: CarbonIcon;

  connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'status');
    }
  }

  render() {
    return html`
      ${
        this.icon
          ? html`<span class="${blockClass}__icon"
              >${iconLoader(this.icon)}</span
            >`
          : nothing
      }
      <span class="${blockClass}__text"><slot></slot></span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-system-message': CDSAIChatSystemMessage;
  }
}

export { CDSAIChatSystemMessage };
export default CDSAIChatSystemMessage;
