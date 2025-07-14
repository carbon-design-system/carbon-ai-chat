/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement } from "lit";
import { property } from "lit/decorators.js";

import { carbonElement } from "../../../decorators/customElement";
import { WEB_COMPONENT_PREFIX } from "../../../settings";
import { chatHeaderLinkTemplate } from "./src/chatHeaderLinkElement.template";

@carbonElement(`${WEB_COMPONENT_PREFIX}-chat-header-link`)
class ChatHeaderLinkElement extends LitElement {
  @property({ type: String })
  url: string;

  @property({ type: String })
  label: string;

  @property({ type: Boolean })
  isNewTab = true;

  render() {
    return chatHeaderLinkTemplate(this);
  }
}

export { ChatHeaderLinkElement };
