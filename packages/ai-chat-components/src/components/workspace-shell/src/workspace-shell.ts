/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html, PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import { carbonElement } from "../../../globals/decorators/index.js";
import prefix from "../../../globals/settings.js";
import commonStyles from "../../../globals/scss/common.scss?lit";
import styles from "./workspace-shell.scss?lit";
import { HeaderCollapsibleManager } from "./header-collapsible-manager.js";

/**
 * Workspace Shell.
 *
 * @element cds-aichat-workspace-shell
 * @slot toolbar - Represents the toolbar area of the workspace.
 * @slot header - Represents the header section, containing title, subtitle and actions.
 * @slot notification - Area for displaying workspace notifications.
 * @slot body - The main content area of the workspace.
 * @slot footer - Represents the footer section, usually containing action buttons.
 *
 */
@carbonElement(`${prefix}-workspace-shell`)
class CDSAIChatWorkspaceShell extends LitElement {
  static styles = [commonStyles, styles];

  /**
   * Enable automatic header collapsible behavior based on available space.
   * When true, the header will automatically become collapsible when the
   * body would have less space than the header. This prop is currently experimental
   * and is subject to future changes.
   *
   * @experimental
   */
  @property({ type: Boolean, attribute: "auto-collapsible-header" })
  autoCollapsibleHeader = false;

  /**
   * @internal
   */
  private headerCollapsibleManager?: HeaderCollapsibleManager;

  connectedCallback() {
    super.connectedCallback();
    this.setupHeaderCollapsibleManager();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.headerCollapsibleManager?.disconnect();
  }

  updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    // If autoCollapsibleHeader changes, setup or teardown manager
    if (changedProperties.has("autoCollapsibleHeader")) {
      if (this.autoCollapsibleHeader) {
        this.setupHeaderCollapsibleManager();
      } else {
        // Clean up: remove collapsible attribute from header before disconnecting
        this.cleanupHeaderCollapsible();
        this.headerCollapsibleManager?.disconnect();
        this.headerCollapsibleManager = undefined;
      }
    }
  }

  private cleanupHeaderCollapsible(): void {
    if (!this.shadowRoot) {
      return;
    }

    const headerSlot = this.shadowRoot.querySelector<HTMLSlotElement>(
      'slot[name="header"]',
    );
    const headerElement = headerSlot?.assignedElements()[0] as HTMLElement;

    if (headerElement) {
      headerElement.removeAttribute("collapsible");
    }
  }

  private setupHeaderCollapsibleManager(): void {
    // Only setup if feature is enabled
    if (!this.autoCollapsibleHeader) {
      return;
    }

    // Don't create a new manager if one already exists
    if (this.headerCollapsibleManager) {
      return;
    }

    this.updateComplete.then(() => {
      if (!this.shadowRoot) {
        return;
      }

      // Double-check in case manager was created while waiting for updateComplete
      if (this.headerCollapsibleManager) {
        return;
      }

      this.headerCollapsibleManager = new HeaderCollapsibleManager(
        this.shadowRoot,
        this,
      );

      this.headerCollapsibleManager.connect((state) => {
        this.headerCollapsibleManager?.updateHeaderCollapsible(
          state.shouldCollapse,
        );
      });
    });
  }

  render() {
    return html`
      <slot name="toolbar"></slot>
      <slot name="notification"></slot>
      <slot name="header"></slot>
      <slot name="body"></slot>
      <slot name="footer"></slot>
    `;
  }
}

export { CDSAIChatWorkspaceShell };
export default CDSAIChatWorkspaceShell;
