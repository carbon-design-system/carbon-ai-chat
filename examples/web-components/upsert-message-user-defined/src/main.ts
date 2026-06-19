/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Upsert message user defined (Web components)
 *
 * Demonstrates: long-running progressive updates to a `user_defined` widget
 * inside a single chat message via `ChatInstance.messaging.upsertMessage`,
 * plus an out-of-chat Carbon toast that fires on each scenario's completion
 * with a "View message" action that calls `instance.scrollToMessage`.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>` with `layout.showFrame: false` + `openChatByDefault: true`
 *   - `PublicConfig.messaging.customSendMessage`
 *   - `.renderUserDefinedResponse` callback on `<cds-aichat-custom-element>`
 *   - `ChatInstance.scrollToMessage`
 *   - `<cds-aichat-card>` / `<cds-aichat-card-steps>` / `<cds-aichat-card-footer>` / `<cds-aichat-toolbar>`
 *   - `<cds-actionable-notification>` / `<cds-actionable-notification-button>`
 *
 * Start reading at: the `config` constant and `render()` below.
 */

// Side-effect imports — register the custom elements used in this example.
import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";
import "@carbon/ai-chat-components/es/components/card/index.js";
import "@carbon/ai-chat-components/es/components/toolbar/index.js";
import "@carbon/web-components/es/components/notification/actionable-notification.js";
import "@carbon/web-components/es/components/notification/actionable-notification-button.js";

import {
  type ChatInstance,
  type PublicConfig,
  type RenderUserDefinedState,
} from "@carbon/ai-chat";
import { ICON_INDICATOR_KIND } from "@carbon/web-components/es/components/icon-indicator/defs.js";
import { html, LitElement, nothing, render } from "lit";
import { customElement, state } from "lit/decorators.js";

import {
  customSendMessage,
  scenarioBus,
  type ScenarioCompleteDetail,
} from "./customSendMessage";

type StepKind = "NOT-STARTED" | "IN-PROGRESS" | "SUCCEEDED";

interface StepsCardPayload {
  user_defined_type: "steps_card";
  title: string;
  status: string;
  showFooter: boolean;
  steps: Array<{
    label: string;
    title: string;
    description: string;
    kind: StepKind;
  }>;
}

interface Toast {
  toastID: string;
  messageID: string;
}

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  layout: {
    // Drop the rounded chat frame so the chat fills its host edge-to-edge.
    showFrame: false,
  },
  // Skip the launcher; readers land in the conversation on first paint.
  openChatByDefault: true,
};

@customElement("my-app")
export class Demo extends LitElement {
  // Light DOM so global Carbon styles apply to slotted user-defined content;
  // host CSS (sizing, toast stack) lives in index.html for the same reason.
  createRenderRoot() {
    return this;
  }

  @state()
  accessor instance: ChatInstance | undefined = undefined;

  // Stable HTMLElement per user_defined message id. Returning the same ref
  // from `renderUserDefinedResponse` is what tells the chat "this is the
  // same widget" — its DOM doesn't move and Lit reconciles the inner
  // template in place when we re-render on each upsert.
  private cardHosts = new Map<string, HTMLElement>();

  @state()
  accessor toasts: Toast[] = [];

  private boundScenarioComplete = (event: Event) => {
    const { messageID } = (event as CustomEvent<ScenarioCompleteDetail>).detail;
    this.toasts = [...this.toasts, { toastID: crypto.randomUUID(), messageID }];
  };

  connectedCallback() {
    super.connectedCallback();
    // The scenarioBus is the named, typed channel between the mock back end
    // (which knows when a scenario finishes) and this host (which owns the
    // toast UI). Subscribe once on mount; unsubscribe on unmount.
    scenarioBus.addEventListener("complete", this.boundScenarioComplete);
  }

  disconnectedCallback() {
    scenarioBus.removeEventListener("complete", this.boundScenarioComplete);
    super.disconnectedCallback();
  }

  private onBeforeRender = (instance: ChatInstance) => {
    this.instance = instance;
  };

  // Invoked by `<cds-aichat-custom-element>` on every user_defined update —
  // including each `upsertMessage` tick. We key the host element by
  // `fullMessage.id` (the assistant message id) and re-render the Lit
  // template into it on every call. Returning the *same* HTMLElement ref
  // tells the chat "this is the same widget" so the DOM isn't disturbed;
  // Lit reconciles the template internally and the `<cds-aichat-card-steps>`
  // element keeps its identity across ticks.
  private renderUserDefinedResponse = (
    state: RenderUserDefinedState,
  ): HTMLElement | null => {
    const payload = state.messageItem?.user_defined as
      | StepsCardPayload
      | undefined;
    if (payload?.user_defined_type !== "steps_card") {
      return null;
    }
    const key = state.fullMessage?.id;
    if (!key) {
      return null;
    }
    let host = this.cardHosts.get(key);
    if (!host) {
      host = document.createElement("div");
      // Spacing rule lives with the host page; see index.html.
      host.className = "steps-card-container";
      this.cardHosts.set(key, host);
    }
    render(this.stepsCardTemplate(payload), host);
    return host;
  };

  private stepsCardTemplate(payload: StepsCardPayload) {
    const steps = payload.steps.map((step) => ({
      label: step.label,
      title: step.title,
      description: step.description,
      kind: ICON_INDICATOR_KIND[step.kind],
    }));
    return html`
      <cds-aichat-card>
        <div slot="header" class="preview-card">
          <cds-aichat-toolbar class="preview-card-toolbar">
            <div slot="title">
              <div class="title-container">
                <h4>${payload.title}</h4>
                <p>${payload.status}</p>
              </div>
            </div>
          </cds-aichat-toolbar>
        </div>
        <div slot="body" class="preview-card preview-card-steps">
          <cds-aichat-card-steps .steps=${steps}></cds-aichat-card-steps>
        </div>
        ${payload.showFooter
          ? html`<cds-aichat-card-footer
              size="md"
              .actions=${[]}
            ></cds-aichat-card-footer>`
          : nothing}
      </cds-aichat-card>
    `;
  }

  private dismiss(toastID: string) {
    this.toasts = this.toasts.filter((toast) => toast.toastID !== toastID);
  }

  private scrollAndDismiss(messageID: string, toastID: string) {
    this.instance?.scrollToMessage(messageID);
    this.dismiss(toastID);
  }

  private renderToasts() {
    return html`
      <div class="toast-stack">
        ${this.toasts.map(
          (toast) => html`
            <cds-actionable-notification
              kind="success"
              title="Steps demo complete"
              subtitle="View the finished card in the conversation."
              @cds-notification-closed=${() => this.dismiss(toast.toastID)}
            >
              <cds-actionable-notification-button
                slot="action"
                @click=${() =>
                  this.scrollAndDismiss(toast.messageID, toast.toastID)}
                >View message</cds-actionable-notification-button
              >
            </cds-actionable-notification>
          `,
        )}
      </div>
    `;
  }

  render() {
    return html`
      <cds-aichat-custom-element
        class="chat-custom-element"
        .messaging=${config.messaging}
        .layout=${config.layout}
        .openChatByDefault=${config.openChatByDefault}
        .onBeforeRender=${this.onBeforeRender}
        .renderUserDefinedResponse=${this.renderUserDefinedResponse}
      ></cds-aichat-custom-element>
      ${this.renderToasts()}
    `;
  }
}
