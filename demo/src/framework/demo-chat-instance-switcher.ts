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

import { ChatInstance, IncreaseOrDecrease, ViewType } from "@carbon/ai-chat";
import { NOTIFICATION_KIND } from "@carbon/web-components/es/components/notification/defs.js";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";

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
  `;

  @property({ type: Object })
  accessor chatInstance: ChatInstance | null = null;

  @state() accessor _notificationCount: number = 0;
  @state() accessor _isRestarting: boolean = false;

  private readonly _notificationGroupId = "demo-notification-group";
  private readonly _notificationKinds = [
    NOTIFICATION_KIND.INFO,
    NOTIFICATION_KIND.SUCCESS,
    NOTIFICATION_KIND.WARNING,
    NOTIFICATION_KIND.ERROR,
  ];

  private _withInstance<T>(
    callback: (instance: ChatInstance) => T,
  ): T | undefined {
    const instance = this.chatInstance;
    if (!instance) {
      return undefined;
    }

    return callback(instance);
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

  private _handleAddNotification = () => {
    const nextCount = this._notificationCount + 1;
    this._notificationCount = nextCount;

    const kind =
      this._notificationKinds[
        Math.floor(Math.random() * this._notificationKinds.length)
      ];

    this._withInstance((instance) => {
      instance.notifications?.addNotification?.({
        kind,
        title: `Demo notification #${nextCount}`,
        message: "This notification was added from the Chat Instance panel.",
        groupID: this._notificationGroupId,
      });
    });
  };

  private _handleClearNotifications = () => {
    this._notificationCount = 0;

    this._withInstance((instance) => {
      instance.notifications?.removeNotifications?.(this._notificationGroupId);
    });
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
        <div class="section-title">
          Notifications <cds-tag type="purple">Preview</cds-tag>
        </div>
        <div class="actions">
          <cds-button kind="secondary" @click=${this._handleAddNotification}>
            Add demo notification
          </cds-button>
          <cds-button kind="ghost" @click=${this._handleClearNotifications}>
            Clear demo notifications
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
    `;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-chat-instance-switcher": DemoChatInstanceSwitcher;
  }
}
