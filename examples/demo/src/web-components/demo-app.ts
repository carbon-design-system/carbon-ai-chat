/**
 *
 * IBM Confidential
 *
 * (C) Copyright IBM Corp. 2024
 *
 * The source code for this program is not published or otherwise
 * divested of its trade secrets, irrespective of what has been
 * deposited with the U. S. Copyright Office
 *
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 *
 */

import "@carbon-labs/ai-chat/es/components/chartElement/chartElement.js";
import "@carbon/web-components/es/components/ai-skeleton/index.js";
import "@carbon/ai-chat/dist/es/cds-aichat-container.js";
import "@carbon/ai-chat/dist/es/cds-aichat-custom-element.js";
import "./user-defined-response-example";
import "./writeable-element-example";

import {
  BusEventMessageItemCustom,
  BusEventType,
  BusEventViewChange,
  ChatInstance,
  CompleteItemChunk,
  GenericItem,
  MessageResponse,
  PartialItemChunk,
  PublicConfig,
  UserDefinedItem,
  ViewType,
} from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { DeepPartial } from "ts-essentials";

import { Settings } from "../framework/types";

interface UserDefinedSlotsMap {
  [key: string]: UserDefinedSlot;
}

interface UserDefinedSlot {
  streaming: boolean;
  message?: GenericItem;
  fullMessage?: MessageResponse;
  messageItem?: DeepPartial<GenericItem>;
  chunk?: PartialItemChunk | CompleteItemChunk;
}

/**
 * `DemoApp` is a custom Lit element representing usage of AI chat with a web component.
 */
@customElement("demo-app")
export class DemoApp extends LitElement {
  static styles = css`
    cds-ai-skeleton-placeholder {
      width: 100%;
    }

    .fullScreen {
      position: fixed;
      top: 0;
      right: 0;
      height: 100vh;
      width: calc(100vw - 320px - 2rem);
      z-index: 9999;
    }

    .sidebar {
      position: fixed;
      right: 0;
      top: 0;
      height: 100vh;
      width: 320px;
      z-index: 9999;
      transition: right 100ms, visibility 0s 100ms; /* Delay visibility change */
      visibility: visible; /* Visible by default */
    }

    .sidebar--closed {
      right: -320px;
      transition: right 100ms, visibility 0s 0s; /* Immediately hide after transition */
      visibility: hidden; /* Hidden after right transition */
    }
  `;

  @property({ type: Object })
  accessor settings!: Settings;

  @property({ type: Object })
  accessor config!: PublicConfig;

  @state()
  accessor sideBarOpen: boolean = false;

  @state()
  accessor instance!: ChatInstance;

  @state()
  accessor userDefinedSlotsMap: UserDefinedSlotsMap = {};

  /**
   * Listens for view changes on the AI chat.
   *
   * @see https://web-chat.global.assistant.watson.cloud.ibm.com/carbon-chat.html?to=api-events#view:change
   */
  onViewChange = (event: BusEventViewChange, instance: ChatInstance) => {
    if (event.newViewState.mainWindow) {
      this.sideBarOpen = true;
    } else {
      this.sideBarOpen = false;
    }
  };

  /**
   * Closes/hides the chat.
   *
   * @see https://web-chat.global.assistant.watson.cloud.ibm.com/carbon-chat.html?to=api-instance-methods#changeView.
   */
  openSideBar = () => {
    this.instance?.changeView(ViewType.MAIN_WINDOW);
  };

  /**
   * Listens for clicks from buttons with custom events attached.
   *
   * @see https://web-chat.global.assistant.watson.cloud.ibm.com/carbon-chat.html?to=api-events#messageItemCustom
   */
  customButtonHandler = (event: any) => {
    const { customEventType, messageItem } = event as BusEventMessageItemCustom;
    // The 'custom_event_name' property comes from the button response type with button_type of custom_event.
    if (
      customEventType === "buttonItemClicked" &&
      messageItem.custom_event_name === "alert_button"
    ) {
      // eslint-disable-next-line no-alert
      window.alert(messageItem.user_defined?.text);
    }
  };

  /**
   * The onBeforeRender prop lets as setup our event handlers and set the instance to state so we can access it
   * whenever we need to later.
   */
  onBeforeRender = (instance: ChatInstance) => {
    this.instance = instance;
    this.instance.on({
      type: BusEventType.MESSAGE_ITEM_CUSTOM,
      handler: this.customButtonHandler,
    });
    this.instance.on({
      type: BusEventType.USER_DEFINED_RESPONSE,
      handler: this.userDefinedHandler,
    });
    this.instance.on({
      type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
      handler: this.userDefinedHandler,
    });

    switch (this.settings.homescreen) {
      case "default":
        instance.updateHomeScreenConfig({
          is_on: true,
          greeting: "Hello!\n\nThis is some text to introduce your chat.",
          starters: {
            is_on: true,
            buttons: [
              {
                label: "text",
              },
              {
                label: "text (stream)",
              },
              {
                label: "code",
              },
              {
                label: "code (stream)",
              },
            ],
          },
        });
        break;

      case "custom":
        instance.updateHomeScreenConfig({
          is_on: true,
          custom_content_only: true,
        });
        break;

      default:
        break;
    }
  };

  /**
   * Each user defined event is tied to a slot deeply rendered with-in AI chat that is generated at runtime.
   * Here we make sure we store all these slots along with their relevant data in order to be able to dynamically
   * render the content to be slotted when this.renderUserDefinedSlots() is called in the render function.
   *
   * @see https://web-chat.global.assistant.watson.cloud.ibm.com/carbon-chat.html?to=api-render#user-defined-responses
   */
  userDefinedHandler = (event: any) => {
    const { data } = event;
    this.userDefinedSlotsMap[data.slot] = {
      streaming: Boolean(data.chunk),
      message: data.message,
      fullMessage: data.fullMessage,
      chunk: data.chunk,
      messageItem: data.messageItem,
    };
    this.requestUpdate();
  };

  /**
   * This renders each of the dynamically generated slots that were generated by the AI chat by calling
   * this.renderUserDefinedResponse on each one.
   *
   * @see https://web-chat.global.assistant.watson.cloud.ibm.com/carbon-chat.html?to=api-render#user-defined-responses
   */
  renderUserDefinedSlots() {
    const userDefinedSlotsKeyArray = Object.keys(this.userDefinedSlotsMap);
    return userDefinedSlotsKeyArray.map((slot) => {
      return this.userDefinedSlotsMap[slot].streaming
        ? this.renderUserDefinedChunk(slot)
        : this.renderUserDefinedResponse(slot);
    });
  }

  /**
   * Here we process a single item from this.userDefinedSlotsMap. We go ahead and use a switch statement to decide
   * which element we should be rendering.
   *
   * @see https://web-chat.global.assistant.watson.cloud.ibm.com/carbon-chat.html?to=api-render#user-defined-responses
   */
  renderUserDefinedResponse(slot: keyof UserDefinedSlotsMap) {
    const { message } = this.userDefinedSlotsMap[slot];

    const userDefinedMessage = message as UserDefinedItem;

    // Check the "type" we have used as our key.
    switch (userDefinedMessage.user_defined?.user_defined_type) {
      case "chart":
        // Be sure to wrap it in the dynamically created slot name!
        // This example is just taking in the Vega charts component from Carbon Labs.
        return html`<div slot=${slot} style="margin-top: 1rem;">
          <clabs-chat-chart
            .content=${userDefinedMessage.user_defined.chart_data as string}
            .disableOptions=${true}
            .disableFullscreen=${true}
            .disableEditor=${true}
            .disableExport=${true}
            .disableCodeInspector=${true}
            .debugMode=${false}
          ></clabs-chat-chart>
        </div>`;
      case "green":
        // And here is an example using your own component.
        return html`<div slot=${slot}>
          <user-defined-response-example
            .text=${userDefinedMessage.user_defined.text as string}
          ></user-defined-response-example>
        </div>`;
      default:
        return null;
    }
  }

  /**
   * Here we process a single item from this.userDefinedSlotsMap. We go ahead and use a switch statement to decide
   * which element we should be rendering.
   *
   * @see https://web-chat.global.assistant.watson.cloud.ibm.com/carbon-chat.html?to=api-render#user-defined-responses
   */
  renderUserDefinedChunk(slot: keyof UserDefinedSlotsMap) {
    const { chunk, messageItem } = this.userDefinedSlotsMap[slot];
    switch (messageItem?.user_defined?.user_defined_type) {
      default:
        // We are just going to always return a skeleton here, but you can give yourself more fine grained control.
        return html`<div slot=${slot}>
          <cds-ai-skeleton-text></cds-ai-skeleton-text>
        </div>`;
    }
  }

  /**
   * You only need to provide slots for the writable elements you want to use. In this demo, we fill them all with big
   * green boxes.
   *
   * @see https://web-chat.global.assistant.watson.cloud.ibm.com/carbon-chat.html?to=api-instance-methods#writeableElements
   */
  renderWriteableElementSlots() {
    if (
      this.settings.writeableElements === "true" &&
      this.instance?.writeableElements
    ) {
      return Object.keys(this.instance.writeableElements).map((key) => {
        return html`<div slot=${key}>
          <writeable-element-example
            location=${key}
          ></writeable-element-example>
        </div>`;
      });
    }
    return null;
  }

  // Depending on which layout is setting in settings, render the right version of AI chat.
  render() {
    return html`
      ${this.settings.layout === "float"
        ? html`<cds-aichat-container
            .config=${this.config}
            .onBeforeRender=${this.onBeforeRender}
            >${this.renderUserDefinedSlots()}${this.renderWriteableElementSlots()}</cds-aichat-container
          >`
        : html``}
      ${this.settings.layout === "sidebar"
        ? html`<cds-aichat-custom-element
            class="sidebar${this.sideBarOpen ? "" : " sidebar--closed"}"
            .config=${this.config}
            .onBeforeRender=${this.onBeforeRender}
            .onViewChange=${this.onViewChange}
            >${this.renderUserDefinedSlots()}${this.renderWriteableElementSlots()}</cds-aichat-custom-element
          >`
        : html``}
      ${this.settings.layout === "fullscreen"
        ? html`<cds-aichat-custom-element
            class="fullScreen"
            .config=${this.config}
            .onBeforeRender=${this.onBeforeRender}
            >${this.renderUserDefinedSlots()}${this.renderWriteableElementSlots()}</cds-aichat-custom-element
          >`
        : html``}
      ${this.settings.layout === "sidebar" && !this.sideBarOpen
        ? html`<demo-side-bar-nav
            .openSideBar=${this.openSideBar}
          ></demo-side-bar-nav>`
        : ""}
    `;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-app": DemoApp;
  }
}
