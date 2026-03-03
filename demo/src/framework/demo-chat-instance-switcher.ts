/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es/components/button/index.js";
import "@carbon/web-components/es/components/tag/index.js";
import "@carbon/web-components/es/components/dropdown/index.js";
import "@carbon/web-components/es/components/checkbox/index.js";
import "@carbon/web-components/es/components/accordion/index.js";

import {
  ChatInstance,
  CustomPanelOpenOptions,
  IncreaseOrDecrease,
  ViewType,
  WriteableElementName,
} from "@carbon/ai-chat";
import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";

interface PanelControlExample {
  id: string;
  buttonLabel: string;
  description: string;
  options: CustomPanelOpenOptions;
  panelBody: string;
  apiType: "current" | "deprecated";
}

@customElement("demo-chat-instance-switcher")
export class DemoChatInstanceSwitcher extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .section {
      margin-bottom: 1.5rem;
    }

    .section:last-of-type {
      margin-bottom: 0;
    }

    .section-title {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
    }

    .actions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .actions cds-button {
      width: fit-content;
    }

    .panel-control {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .panel-control__description {
      margin: 0;
      color: var(--cds-text-secondary, #525252);
      font-size: 0.875rem;
    }

    .panel-section-header {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--cds-text-primary, #161616);
      margin-top: 1rem;
      margin-bottom: 0.5rem;
      padding-bottom: 0.25rem;
      border-bottom: 1px solid var(--cds-border-subtle, #e0e0e0);
    }

    .panel-section-header:first-child {
      margin-top: 0;
    }

    .panel-config {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem;
      background: var(--cds-layer-01, #f4f4f4);
      border-radius: 4px;
    }

    .panel-config cds-checkbox {
      margin-bottom: 0.25rem;
    }

    .panel-config-checkboxes {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    cds-accordion {
      margin-top: 1rem;
    }

    cds-accordion-item {
      margin-bottom: 0;
    }
  `;

  @property({ type: Object })
  accessor chatInstance: ChatInstance | null = null;

  @state() accessor _isRestarting: boolean = false;

  // Panel configuration state
  @state() accessor _hideBackButton: boolean = false;
  @state() accessor _backButtonType: "minimize" | "close" = "minimize";
  @state() accessor _disableAnimation: boolean = false;
  @state() accessor _aiEnabled: boolean = false;
  @state() accessor _showFrame: boolean = false;
  @state() accessor _fullWidth: boolean = false;

  private readonly _panelExamples: PanelControlExample[] = [
    {
      id: "panel-basic-deprecated",
      buttonLabel: "Basic panel",
      description: "Basic deprecated panel with title only.",
      apiType: "deprecated",
      options: {
        title: "Basic deprecated panel",
      },
      panelBody: `
        <div>
          <h3>Basic deprecated panel</h3>
          <p><strong>API:</strong> CustomPanelConfigOptions (Deprecated)</p>
          <p style="color: #da1e28;">⚠️ This API is deprecated. Use DefaultCustomPanelConfigOptions instead.</p>
          <p>This demonstrates the basic usage of the deprecated CustomPanelConfigOptions interface.</p>
          <ul>
            <li><code>title</code>: <strong>"Basic deprecated panel"</strong></li>
          </ul>
          <cds-button kind="danger" data-close-panel>
            Close Panel
          </cds-button>
        </div>
      `,
    },
    {
      id: "panel-hidden-close-button",
      buttonLabel: "Panel with hidden close button",
      description: "Hides the close/minimize button in the panel header.",
      apiType: "deprecated",
      options: {
        title: "Panel without close button",
        hideCloseButton: true,
      },
      panelBody: `
        <div>
          <h3>Panel without close button</h3>
          <p><strong>API:</strong> CustomPanelConfigOptions (Deprecated)</p>
          <p style="color: #da1e28;">⚠️ This API is deprecated. Use DefaultCustomPanelConfigOptions instead.</p>
          <p>The close/minimize button in the header is hidden. Users must use the back button or this close button.</p>
          <ul>
            <li><code>title</code>: <strong>"Panel without close button"</strong></li>
            <li><code>hideCloseButton</code>: <strong>true</strong></li>
          </ul>
          <cds-button kind="danger" data-close-panel>
            Close Panel
          </cds-button>
        </div>
      `,
    },
    {
      id: "panel-hidden-back-button",
      buttonLabel: "Panel with hidden back button",
      description: "Hides the back button in the panel header.",
      apiType: "deprecated",
      options: {
        title: "Panel without back button",
        hideBackButton: true,
      },
      panelBody: `
        <div>
          <h3>Panel without back button</h3>
          <p><strong>API:</strong> CustomPanelConfigOptions (Deprecated)</p>
          <p style="color: #da1e28;">⚠️ This API is deprecated. Use DefaultCustomPanelConfigOptions instead.</p>
          <p>The back button in the header is hidden. Users are stuck interacting with the panel.</p>
          <ul>
            <li><code>title</code>: <strong>"Panel without back button"</strong></li>
            <li><code>hideBackButton</code>: <strong>true</strong></li>
          </ul>
          <cds-button kind="danger" data-close-panel>
            Close Panel
          </cds-button>
        </div>
      `,
    },
    {
      id: "panel-hidden-header",
      buttonLabel: "Panel with hidden header",
      description: "Completely hides the panel header chrome.",
      apiType: "deprecated",
      options: {
        hidePanelHeader: true,
      },
      panelBody: `
        <div>
          <h3>Panel with hidden header</h3>
          <p><strong>API:</strong> CustomPanelConfigOptions (Deprecated)</p>
          <p style="color: #da1e28;">⚠️ This API is deprecated. Use DefaultCustomPanelConfigOptions instead.</p>
          <p>The entire panel header is hidden, including title, AI slug, minimize button, and back button.</p>
          <ul>
            <li><code>hidePanelHeader</code>: <strong>true</strong></li>
          </ul>
          <p>This is useful for chrome-free experiences where the panel content provides its own controls.</p>
          <cds-button kind="danger" data-close-panel>
            Close Panel
          </cds-button>
        </div>
      `,
    },
  ];
  @state() accessor _inputVisible: boolean = true;
  @state() accessor _inputsDisabled: boolean = false;
  @state() accessor _unreadIndicatorVisible: boolean = false;

  protected updated(changed: PropertyValues) {
    if (changed.has("chatInstance")) {
      const nextInstance = this.chatInstance;
      if (!nextInstance) {
        this._inputVisible = true;
        this._inputsDisabled = false;
        this._unreadIndicatorVisible = false;
        this._isRestarting = false;
        return;
      }

      const publicState = nextInstance.getState?.();

      if (publicState) {
        this._unreadIndicatorVisible = Boolean(publicState.showUnreadIndicator);
      }
    }
  }

  private _withInstance<T>(
    callback: (instance: ChatInstance) => T,
  ): T | undefined {
    const instance = this.chatInstance;
    if (!instance) {
      return undefined;
    }

    return callback(instance);
  }

  private _writeCustomPanelContent(content: string) {
    const element =
      this.chatInstance?.writeableElements?.[
        WriteableElementName.CUSTOM_PANEL_ELEMENT
      ];
    if (!element) {
      return;
    }

    element.innerHTML = content.trim();

    // Add event listener for close button clicks within the panel
    const closeButton = element.querySelector("[data-close-panel]");
    if (closeButton) {
      closeButton.addEventListener("click", () => {
        this._withInstance((instance) => {
          const panel = instance.customPanels?.getPanel();
          panel?.close();
        });
      });
    }
  }

  private _handleOpenCustomPanelExample(example: PanelControlExample) {
    this._withInstance((instance) => {
      const panel = instance.customPanels?.getPanel();
      if (!panel) {
        return;
      }

      this._writeCustomPanelContent(example.panelBody);
      panel.open(example.options);
    });
  }

  private _handleOpenConfiguredPanel = () => {
    this._withInstance((instance) => {
      const panel = instance.customPanels?.getPanel();
      if (!panel) {
        return;
      }

      // Build options from current state
      const options: any = {
        title: "Custom Panel Configuration",
        backButtonType: this._backButtonType,
      };

      if (this._hideBackButton) {
        options.hideBackButton = true;
      }
      if (this._disableAnimation) {
        options.disableAnimation = true;
      }
      if (this._aiEnabled) {
        options.aiEnabled = true;
      }
      if (this._showFrame) {
        options.showFrame = true;
      }
      if (this._fullWidth) {
        options.fullWidth = true;
      }

      // Generate dynamic panel content
      const panelBody = this._generatePanelBody(options);
      this._writeCustomPanelContent(panelBody);
      panel.open(options);
    });
  };

  private _generatePanelBody(options: any): string {
    const optionsList: string[] = [];

    if (options.title) {
      optionsList.push(
        `<li><code>title</code>: <strong>"${options.title}"</strong></li>`,
      );
    }
    if (options.hideBackButton) {
      optionsList.push(
        `<li><code>hideBackButton</code>: <strong>true</strong></li>`,
      );
    }
    if (options.backButtonType) {
      optionsList.push(
        `<li><code>backButtonType</code>: <strong>"${options.backButtonType}"</strong></li>`,
      );
    }
    if (options.disableAnimation) {
      optionsList.push(
        `<li><code>disableAnimation</code>: <strong>true</strong></li>`,
      );
    }
    if (options.aiEnabled) {
      optionsList.push(
        `<li><code>aiEnabled</code>: <strong>true</strong></li>`,
      );
    }
    if (options.showFrame) {
      optionsList.push(
        `<li><code>showFrame</code>: <strong>true</strong></li>`,
      );
    }
    if (options.fullWidth) {
      optionsList.push(
        `<li><code>fullWidth</code>: <strong>true</strong></li>`,
      );
    }

    const optionsHtml =
      optionsList.length > 0
        ? `<ul>${optionsList.join("\n            ")}</ul>`
        : "<p><em>No options configured (using all defaults)</em></p>";

    return `
      <div>
        <h3>Custom Configured Panel</h3>
        <p><strong>API:</strong> DefaultCustomPanelConfigOptions (Current)</p>
        <p>This panel was opened with the options you configured:</p>
        ${optionsHtml}
        <cds-button kind="danger" data-close-panel>
          Close Panel
        </cds-button>
      </div>
    `;
  }

  private _handleShowCatastrophicError = () => {
    this._withInstance((instance) => {
      const instanceWithManager = instance as any;
      if (instanceWithManager.serviceManager) {
        // Dispatch action directly to set catastrophicErrorType
        instanceWithManager.serviceManager.store.dispatch({
          type: "SET_APP_STATE_VALUE",
          key: "catastrophicErrorType",
          value: true,
        });
      } else {
        alert(
          "serviceManager is not available. Set exposeServiceManagerForTesting: true in PublicConfig.",
        );
      }
    });
  };

  private _handleRequestFocus = () => {
    this._withInstance((instance) => {
      instance.requestFocus?.();
    });
  };

  private _handleAutoScroll = () => {
    this._withInstance((instance) => {
      instance.doAutoScroll?.();
    });
  };

  private _handleRestartConversation = async () => {
    if (this._isRestarting) {
      return;
    }

    this._isRestarting = true;

    try {
      const promise = this._withInstance(
        (instance) =>
          instance.messaging?.restartConversation?.() ?? Promise.resolve(),
      );
      if (promise) {
        await promise;
      }
    } finally {
      this._isRestarting = false;
    }
  };

  private _handleLoadingCounter(
    direction: IncreaseOrDecrease,
    withText?: boolean,
  ) {
    this._withInstance(async (instance) => {
      if (direction === "increase") {
        instance.updateIsMessageLoadingCounter?.(
          direction,
          withText ? "Thinking..." : undefined,
        );
      } else {
        instance.updateIsMessageLoadingCounter?.(direction);
      }
    });
  }

  private _handleChatLoadingCounter(direction: IncreaseOrDecrease) {
    this._withInstance((instance) => {
      instance.updateIsChatLoadingCounter?.(direction);
    });
  }

  private _handleChangeViewMainWindow = () => {
    this._withInstance((instance) => {
      void instance.changeView?.(ViewType.MAIN_WINDOW);
    });
  };

  private _handleChangeViewLauncher = () => {
    this._withInstance((instance) => {
      void instance.changeView?.({ mainWindow: false, launcher: true });
    });
  };

  private _handleBackButtonTypeChanged = (event: Event) => {
    const customEvent = event as CustomEvent;
    this._backButtonType = customEvent.detail.item.value;
  };

  render() {
    return html`
      <div class="section">
        <div class="section-title">Focus & scrolling</div>
        <div class="actions">
          <cds-button kind="secondary" @click=${this._handleRequestFocus}>
            Request focus
          </cds-button>
          <cds-button kind="secondary" @click=${this._handleAutoScroll}>
            Trigger auto scroll
          </cds-button>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Conversation</div>
        <div class="actions">
          <cds-button
            kind="secondary"
            ?disabled=${this._isRestarting}
            @click=${this._handleRestartConversation}
          >
            ${this._isRestarting ? "Restarting..." : "Restart conversation"}
          </cds-button>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Loading counters</div>
        <div class="actions">
          <cds-button
            kind="secondary"
            @click=${() => this._handleLoadingCounter("increase")}
          >
            Increment message loading
          </cds-button>
          <cds-button
            kind="secondary"
            @click=${() => this._handleLoadingCounter("increase", true)}
          >
            Increment message loading<br />(with optional helper text)
          </cds-button>
          <cds-button
            kind="secondary"
            @click=${() => this._handleLoadingCounter("decrease")}
          >
            Decrement message loading
          </cds-button>
          <cds-button
            kind="secondary"
            @click=${() => this._handleChatLoadingCounter("increase")}
          >
            Increment chat hydration
          </cds-button>
          <cds-button
            kind="secondary"
            @click=${() => this._handleChatLoadingCounter("decrease")}
          >
            Decrement chat hydration
          </cds-button>
        </div>
      </div>

      <div class="section">
        <div class="section-title">View controls</div>
        <div class="actions">
          <cds-button
            kind="secondary"
            @click=${this._handleChangeViewMainWindow}
          >
            Open chat window
          </cds-button>
          <cds-button kind="secondary" @click=${this._handleChangeViewLauncher}>
            Close chat window
          </cds-button>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Panel controls</div>
        <div class="actions">
          <div class="panel-section-header">
            DefaultCustomPanelConfigOptions<br />(Current API)
          </div>

          <div class="panel-config">
            <cds-dropdown
              value="${this._backButtonType}"
              title-text="Back button type"
              ?disabled=${this._hideBackButton}
              @cds-dropdown-selected=${this._handleBackButtonTypeChanged}
            >
              <cds-dropdown-item value="minimize">Minimize</cds-dropdown-item>
              <cds-dropdown-item value="close">Close</cds-dropdown-item>
            </cds-dropdown>

            <div class="panel-config-checkboxes">
              <cds-checkbox
                ?checked=${this._hideBackButton}
                @cds-checkbox-changed=${(e: any) => {
                  this._hideBackButton = e.target.checked;
                }}
              >
                Hide back button
              </cds-checkbox>

              <cds-checkbox
                ?checked=${this._disableAnimation}
                @cds-checkbox-changed=${(e: any) => {
                  this._disableAnimation = e.target.checked;
                }}
              >
                Disable animation
              </cds-checkbox>

              <cds-checkbox
                ?checked=${this._aiEnabled}
                @cds-checkbox-changed=${(e: any) => {
                  this._aiEnabled = e.target.checked;
                }}
              >
                Enable AI gradient
              </cds-checkbox>

              <cds-checkbox
                ?checked=${this._showFrame}
                @cds-checkbox-changed=${(e: any) => {
                  this._showFrame = e.target.checked;
                }}
              >
                Show frame border
              </cds-checkbox>

              <cds-checkbox
                ?checked=${this._fullWidth}
                @cds-checkbox-changed=${(e: any) => {
                  this._fullWidth = e.target.checked;
                }}
              >
                Full width layout
              </cds-checkbox>
            </div>

            <cds-button
              kind="primary"
              @click=${this._handleOpenConfiguredPanel}
            >
              Open Panel
            </cds-button>
          </div>

          <cds-accordion>
            <cds-accordion-item
              title="CustomPanelConfigOptions (Deprecated API)"
            >
              <div class="actions">
                ${this._panelExamples
                  .filter((example) => example.apiType === "deprecated")
                  .map(
                    (example) => html`
                      <div class="panel-control">
                        <cds-button
                          kind="secondary"
                          @click=${() =>
                            this._handleOpenCustomPanelExample(example)}
                        >
                          ${example.buttonLabel}
                        </cds-button>
                        <p class="panel-control__description">
                          ${example.description}
                        </p>
                      </div>
                    `,
                  )}
              </div>
            </cds-accordion-item>
          </cds-accordion>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Error testing</div>
        <div class="actions">
          <cds-button kind="danger" @click=${this._handleShowCatastrophicError}>
            Show catastrophic error panel
          </cds-button>
        </div>
      </div>
    `;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-chat-instance-switcher": DemoChatInstanceSwitcher;
  }
}
