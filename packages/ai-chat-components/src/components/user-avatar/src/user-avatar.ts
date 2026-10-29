/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { iconLoader } from '@carbon/web-components/es/globals/internal/icon-loader.js';
import UserAvatar32 from '@carbon/icons/es/user--avatar/32.js';
import { carbonElement } from '../../../globals/decorators/index.js';
import prefix from '../../../globals/settings.js';
import commonStyles from '../../../globals/scss/common.scss?lit';
import {
  adoptOnRoot,
  clearSelector,
  clearVarsForSelector,
  setVarsForSelector,
} from '../../shared/dynamic-css-var-sheet.js';
import styles from './user-avatar.scss?lit';

const blockClass = `${prefix}-user-avatar`;
const INSTANCE_ATTR = 'data-instance-id';

/**
 * A name made only of characters from U+0020 to U+00FE can use its first
 * character as an initial. Browsers cannot reliably detect Latin script, so a
 * name with any other character, such as Chinese, gets the icon instead.
 */
const INITIAL_PATTERN = /^[\x20-\xFE]+$/;

let instanceCounter = 0;

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

  private readonly _instanceId = `ua-${++instanceCounter}`;

  private get _instanceSelector(): string {
    return `[${INSTANCE_ATTR}="${this._instanceId}"]`;
  }

  connectedCallback() {
    super.connectedCallback();
    // The size rule is removed on disconnect, so restore it if the element moves.
    if (this.hasUpdated) {
      this._syncSize();
    }
  }

  disconnectedCallback() {
    clearSelector(this._instanceSelector);
    super.disconnectedCallback();
  }

  protected willUpdate(changed: Map<string, unknown>) {
    // A new URL deserves a new attempt, so forget the earlier failure.
    if (changed.has('image')) {
      this._hasImageError = false;
    }
  }

  protected firstUpdated() {
    adoptOnRoot(this.renderRoot as ShadowRoot);
  }

  protected updated(changed: Map<string, unknown>) {
    if (changed.has('width') || changed.has('height')) {
      this._syncSize();
    }
  }

  /** Applies the host's width and height through the shared dynamic sheet. */
  private _syncSize() {
    const selector = this._instanceSelector;
    const sizes: Record<string, string> = {
      'inline-size': this.width,
      'block-size': this.height,
    };
    const set: Record<string, string> = {};
    const unset: string[] = [];
    for (const [prop, value] of Object.entries(sizes)) {
      if (value) {
        set[prop] = value;
      } else {
        unset.push(prop);
      }
    }
    if (Object.keys(set).length) {
      setVarsForSelector(selector, set);
    }
    // A cleared width or height returns to the default size.
    clearVarsForSelector(selector, unset);
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

    if (INITIAL_PATTERN.test(this.name)) {
      return html`<div
        class="${blockClass}__initial"
        role=${role}
        aria-label=${label}>
        <div class="${blockClass}__letter">${this.name.charAt(0)}</div>
      </div>`;
    }

    return html`<div
      class="${blockClass}__icon"
      role=${role}
      aria-label=${label}>
      ${iconLoader(UserAvatar32, {
        class: `${blockClass}__icon-svg`,
        'aria-hidden': 'true',
      })}
    </div>`;
  }

  render() {
    return html`<div
      class="${blockClass}__avatar"
      data-instance-id=${this._instanceId}>
      ${this._renderContent()}
    </div>`;
  }
}

export { CDSAIChatUserAvatar };
export default CDSAIChatUserAvatar;
