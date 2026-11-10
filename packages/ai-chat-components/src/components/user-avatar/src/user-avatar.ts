/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { iconLoader } from '@carbon/web-components/es/globals/internal/icon-loader.js';
import UserAvatar32 from '@carbon/icons/es/user--avatar/32.js';
import { carbonElement } from '../../../globals/decorators/index.js';
import prefix from '../../../globals/settings.js';
import commonStyles from '../../../globals/scss/common.scss?lit';
import styles from './user-avatar.scss?lit';

const blockClass = `${prefix}-user-avatar`;

/**
 * A name made only of characters from U+0020 to U+00FE can use its first
 * character as an initial. Browsers cannot reliably detect Latin script, so a
 * name with any other character, such as Chinese, gets the icon instead.
 */
const INITIAL_PATTERN = /^[\x20-\xFE]+$/;

/**
 * Shows a person as a profile image, the first letter of their name, or a
 * default user icon. It tries them in that order: a missing or failed image
 * falls back to the initial, and a name with no usable initial falls back to
 * the icon.
 *
 * @experimental
 * @element cds-aichat-user-avatar
 */
@carbonElement(blockClass)
class CDSAIChatUserAvatar extends LitElement {
  static styles = [commonStyles, styles];

  /**
   * The user's name. Its first character is the fallback initial when the
   * name only contains characters from U+0020 to U+00FE. Any other name, or no
   * name, shows the user icon.
   */
  @property({ type: String })
  name = '';

  /**
   * URL of the profile image. If the image fails to load, the avatar shows the
   * initial or icon. Changing the URL tries the new image.
   */
  @property({ type: String })
  image = '';

  /**
   * Accessible label for the avatar.
   */
  @property({ type: String })
  label = '';

  /**
   * Width of the avatar, as a CSS length such as `48px`. Defaults to 2rem.
   */
  @property({ type: String })
  width = '';

  /**
   * Height of the avatar, as a CSS length such as `48px`. Defaults to 2rem.
   */
  @property({ type: String })
  height = '';

  /** Whether the current `image` failed to load. */
  @state()
  private _hasImageError = false;

  @query(`.${blockClass}__avatar`)
  private readonly _avatar!: HTMLElement;

  protected willUpdate(changed: PropertyValues) {
    // A new URL deserves a new attempt, so forget the earlier failure.
    if (changed.has('image')) {
      this._hasImageError = false;
    }
  }

  protected updated(changed: PropertyValues) {
    if (changed.has('width')) {
      this._avatar.style.inlineSize = this.width;
    }
    if (changed.has('height')) {
      this._avatar.style.blockSize = this.height;
    }
  }

  private _onImageError = (): void => {
    this._hasImageError = true;
  };

  private _renderContent() {
    const label = this.label || nothing;
    const role = this.label ? 'img' : nothing;

    if (this.image && !this._hasImageError) {
      return html`<img
        class="${blockClass}__image"
        src=${this.image}
        alt=${this.label}
        @error=${this._onImageError} />`;
    }

    const hidden = this.label ? nothing : 'true';

    if (INITIAL_PATTERN.test(this.name)) {
      return html`<div
        class="${blockClass}__initial"
        role=${role}
        aria-label=${label}
        aria-hidden=${hidden}>
        <div class="${blockClass}__letter">${this.name.trim().charAt(0)}</div>
      </div>`;
    }

    return html`<div
      class="${blockClass}__icon"
      role=${role}
      aria-label=${label}
      aria-hidden=${hidden}>
      ${iconLoader(UserAvatar32, {
        class: `${blockClass}__icon-svg`,
        'aria-hidden': 'true',
      })}
    </div>`;
  }

  render() {
    return html`<div class="${blockClass}__avatar">
      ${this._renderContent()}
    </div>`;
  }
}

export { CDSAIChatUserAvatar };
export default CDSAIChatUserAvatar;
