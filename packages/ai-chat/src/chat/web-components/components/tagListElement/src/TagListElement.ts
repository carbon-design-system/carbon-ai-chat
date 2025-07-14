/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { css, LitElement, PropertyValues, unsafeCSS } from "lit";
import { property, state } from "lit/decorators.js";

import styles from "./tagListElement.scss";

export default class TagListElement extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
  `;

  /**
   * The list of tags to display.
   */
  @property({ type: Array, attribute: "tags" })
  tags: string[];

  /**
   * The initial set of tags to show as selected.
   */
  @property({ type: Array, attribute: "initial-selected-tags" })
  initialSelectedTags: string[];

  /**
   * Indicates if multiple tags may be selected.
   */
  @property({ type: Boolean, attribute: "multi-select" })
  multiSelect: boolean;

  /**
   * The callback that is called when the set of selected tags changes.
   */
  @property({ type: Object, attribute: "on-tags-changed" })
  onTagsChanged: (selected: string[]) => void;

  /**
   * The set of tags that have been selected.
   */
  @state()
  selectedTags: Set<string> = new Set();

  /**
   * Called when the properties of the component have changed.
   */
  updated(changedProperties: PropertyValues<this>) {
    if (changedProperties.has("initialSelectedTags")) {
      this._setInitialValues(this.initialSelectedTags);
    }
  }

  /**
   * Updates the initial values used in the component.
   */
  _setInitialValues(values: string[]) {
    if (values) {
      this.selectedTags = new Set(this.initialSelectedTags);
    }
  }

  /**
   * Called when a tag is clicked.
   */
  _handleTagClick(event: MouseEvent) {
    const tagValue = (event.target as HTMLElement).getAttribute("data-content");

    const isSelected = this.selectedTags.has(tagValue);
    if (isSelected) {
      this.selectedTags.delete(tagValue);
    } else {
      this.selectedTags.add(tagValue);
    }

    this.onTagsChanged?.(Array.from(this.selectedTags));

    // Force an update because we changed selectedTags internally but the property reference itself didn't change.
    this.requestUpdate();
  }
}
