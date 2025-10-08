/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { css, LitElement, unsafeCSS } from "lit";
import { property, state } from "lit/decorators.js";

import styles from "./chatHeaderAvatarElement.scss";
import { CornersType } from "../../../../../../../types/config/CornersType";

class ChatHeaderAvatarElement extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
  `;

  /**
   * The image url.
   */
  @property({ type: String })
  url: string;

  /**
   * The image url.
   */
  @property({ type: String })
  corners: CornersType;

  /**
   * The alt attribute for the image.
   */
  @property({ type: String })
  alt: string;

  /**
   * The callback function to fire when the image fails to load.
   */
  @property({ type: Object })
  onError?: () => void;

  @state()
  isLoaded = false;

  /**
   * Called when the onError callback function is fired.
   */
  _handleOnError = () => {
    this.onError?.();
  };
}

export { ChatHeaderAvatarElement };
