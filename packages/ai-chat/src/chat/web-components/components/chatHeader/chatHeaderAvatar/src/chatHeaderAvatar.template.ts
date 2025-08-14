/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es-custom/components/skeleton-icon/index.js";

import cx from "classnames";
import { html } from "lit";

import { ChatHeaderAvatarElement } from "./chatHeaderAvatarElement";
import { CSS_CLASS_PREFIX } from "../../../../settings";
import { CornersType } from "../../../../../../types/config/CornersType";

export function chatHeaderAvatarTemplate(
  classElement: ChatHeaderAvatarElement,
) {
  const { url, corners, alt, onError } = classElement;
  return html`
    <img
      class="${cx(`${CSS_CLASS_PREFIX}-chat-header-avatar`, {
        [`${CSS_CLASS_PREFIX}-chat-header-avatar--round`]:
          corners === CornersType.ROUND,
      })}"
      src="${url}"
      alt="${alt}"
      @error="${onError}"
    />
  `;
}
