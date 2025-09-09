/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { carbonElement } from "../../decorators/customElement";
import { prefix } from "../../settings";
import TagListElement from "./src/TagListElement";
import { tagListElementTemplate } from "./src/tagListElement.template";

const TAG_LIST_TAG_NAME = `${prefix}-tag-list`;

/**
 * This component is used to display a list of tags that the user can choose from.
 */
@carbonElement(TAG_LIST_TAG_NAME)
class CDSTagListElement extends TagListElement {
  /**
   * Renders the template while passing in class functionality.
   */
  render() {
    return tagListElementTemplate(this);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-tag-list": CDSTagListElement;
  }
}

export { TAG_LIST_TAG_NAME, CDSTagListElement };
