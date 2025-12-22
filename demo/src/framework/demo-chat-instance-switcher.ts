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
  `;

  @property({ type: Object })
  accessor chatInstance: ChatInstance | null = null;

  @state() accessor _isRestarting: boolean = false;

  private readonly _panelExamples: PanelControlExample[] = [
    {
      id: "panel-with-back-button",
      buttonLabel: "Open panel (with back button)",
      description:
        "Animates in and keeps the default header so you can use the back button.",
      options: {
        title: "Panel with navigation",
      },
      panelBody: `
        <div style="padding: 1rem;">
          <h3>Panel with default navigation</h3>
          <p>The back button stays visible so visitors can return to their conversation without dismissing the panel.</p>
          <ul>
            <li><code>hideBackButton</code>: <strong>false</strong></li>
            <li><code>disableAnimation</code>: <strong>false</strong></li>
          </ul>
        </div>
      `,
    },
    {
      id: "panel-without-back-button",
      buttonLabel: "Open panel (without back button)",
      description: "Animates in and hides the back button for focused flows.",
      options: {
        title: "Panel without back button",
        hideBackButton: true,
      },
      panelBody: `
        <div style="padding: 1rem;">
          <h3>Panel without back navigation</h3>
          <p>This layout is useful when the panel handles its own progression.</p>
          <ul>
            <li><code>hideBackButton</code>: <strong>true</strong></li>
          </ul>
        </div>
      `,
    },
    {
      id: "panel-without-animations",
      buttonLabel: "Open panel (without animations)",
      description:
        "Skips the animation and hides the back button for focused flows.",
      options: {
        title: "Panel without back button",
        hideBackButton: true,
        disableAnimation: true,
      },
      panelBody: `
        <div style="padding: 1rem;">
          <h3>Panel without back navigation</h3>
          <p>This layout is useful when the panel handles its own progression.</p>
          <ul>
            <li><code>hideBackButton</code>: <strong>true</strong></li>
            <li><code>disableAnimation</code>: <strong>true</strong></li>
          </ul>
          <p>The panel opened instantly because animations were disabled.</p>
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

  private _handleCloseCustomPanel = () => {
    this._withInstance((instance) => {
      const panel = instance.customPanels?.getPanel();
      panel?.close();
    });
  };

  private _handleWorkspacePanelAnimation(event: CustomEvent) {
    const value = event.detail.item.value;
    const disableAnimation = value === "withoutAnimations";
    this._withInstance((instance) => {
      instance.updateWorkspaceAnimationBehaviour(disableAnimation);
    });
  }

  private _handleChangeWorkspacePosition(event: CustomEvent) {
    const preferredLocation = event.detail?.item?.value;
    this._withInstance((instance) => {
      instance.updateWorkspacePosition(preferredLocation);
    });
  }

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

  private _handleInputVisibilityChange(event: CustomEvent) {
    const checked = event.detail.checked as boolean;
    this._inputVisible = checked;

    this._withInstance((instance) => {
      instance.updateInputFieldVisibility?.(checked);
    });
  }

  private _handleInputsDisabledChange(event: CustomEvent) {
    const checked = event.detail.checked as boolean;
    this._inputsDisabled = checked;

    this._withInstance((instance) => {
      instance.updateInputIsDisabled?.(checked);
    });
  }

  private _handleUnreadIndicatorChange(event: CustomEvent) {
    const checked = event.detail.checked as boolean;
    this._unreadIndicatorVisible = checked;

    this._withInstance((instance) => {
      instance.updateAssistantUnreadIndicatorVisibility?.(checked);
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
          ${this._panelExamples.map(
            (example) => html`
              <div class="panel-control">
                <cds-button
                  kind="secondary"
                  @click=${() => this._handleOpenCustomPanelExample(example)}
                >
                  ${example.buttonLabel}
                </cds-button>
                <p class="panel-control__description">${example.description}</p>
              </div>
            `,
          )}
          <cds-button kind="ghost" @click=${this._handleCloseCustomPanel}>
            Close custom panel
          </cds-button>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Workspace controls</div>
        <div class="actions">
          <cds-dropdown
            value="end"
            title-text="Position"
            @cds-dropdown-selected=${this._handleChangeWorkspacePosition}
          >
            <cds-dropdown-item value="start">start</cds-dropdown-item>
            <cds-dropdown-item value="end">end</cds-dropdown-item>
          </cds-dropdown>
          <p class="panel-control__description">
            Specifies the posotion of Workspace Panel
          </p>
          <div class="panel-control">
            <cds-dropdown
              value="withAnimations"
              title-text="Animations"
              @cds-dropdown-selected=${this._handleWorkspacePanelAnimation}
            >
              <cds-dropdown-item value="withAnimations"
                >With Animations</cds-dropdown-item
              >
              <cds-dropdown-item value="withoutAnimations"
                >Without Animations</cds-dropdown-item
              >
            </cds-dropdown>
            <p class="panel-control__description">
              Disables/Enables animation for Workspace Panels.
            </p>
          </div>
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
