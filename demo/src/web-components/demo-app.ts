/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es/components/ai-skeleton/index.js";
import "@carbon/ai-chat/dist/es/web-components/cds-aichat-container/index.js";
import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";
import "./user-defined-response-example";
import "./writeable-element-example";
import "./workspace-writeable-element-example";

import {
  BusEvent,
  BusEventMessageItemCustom,
  BusEventType,
  BusEventViewChange,
  BusEventViewPreChange,
  ChatInstance,
  GenericItem,
  MessageResponse,
  PublicConfig,
  ServiceDesk,
  ServiceDeskFactoryParameters,
  UserDefinedItem,
  ViewType,
} from "@carbon/ai-chat";
import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { DeepPartial } from "../types/DeepPartial";

import { Settings } from "../framework/types";
import { MockServiceDesk } from "../mockServiceDesk/mockServiceDesk";

async function sleep(milliseconds: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

const serviceDeskFactory = (parameters: ServiceDeskFactoryParameters) =>
  Promise.resolve(new MockServiceDesk(parameters) as ServiceDesk);

interface UserDefinedSlotsMap {
  [key: string]: UserDefinedSlot;
}

interface UserDefinedSlot {
  streaming: boolean;
  message?: GenericItem;
  fullMessage?: MessageResponse;
  messageItem?: DeepPartial<GenericItem>;
  partialItems?: GenericItem[];
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
      bottom: 0;
      right: 0;
      height: calc(100vh - 48px);
      width: calc(100vw - 320px - 2rem);
      z-index: 9999;
    }

    .sidebar {
      position: fixed;
      right: 0;
      top: 48px;
      height: calc(100vh - 48px);
      width: 320px;
      z-index: 9999;
      /* Carbon motion token: motion.$duration-moderate-01 (240ms) with motion.motion(standard, productive) */
      transition: right 240ms cubic-bezier(0.2, 0, 0.38, 0.9);
      visibility: visible;
    }

    .sidebar--expanded {
      width: calc(100vw - 320px - 2rem);
    }

    .sidebar--expanding {
      /* Carbon motion tokens: motion.$duration-moderate-01 (240ms) and motion.$duration-moderate-02 (400ms) with motion.motion(standard, productive) */
      transition:
        right 240ms cubic-bezier(0.2, 0, 0.38, 0.9),
        width 400ms cubic-bezier(0.2, 0, 0.38, 0.9);
    }

    .sidebar--contracting {
      /* Carbon motion tokens: motion.$duration-moderate-01 (240ms) and motion.$duration-moderate-02 (400ms) with motion.motion(standard, productive) */
      transition:
        right 240ms cubic-bezier(0.2, 0, 0.38, 0.9),
        width 400ms cubic-bezier(0.2, 0, 0.38, 0.9);
    }

    .sidebar--closing {
      right: calc(calc(320px + 1rem) * -1);
      width: 320px;
    }

    .sidebar--closed {
      right: calc(calc(320px + 1rem) * -1);
      width: 320px;
      visibility: hidden;
    }

    /* RTL support */
    [dir="rtl"] .sidebar {
      right: auto;
      left: 0;
      /* Carbon motion token: motion.$duration-fast-01 (70ms) with motion.motion(standard, productive) */
      transition:
        left 70ms cubic-bezier(0.2, 0, 0.38, 0.9),
        visibility 0s 70ms;
    }

    [dir="rtl"] .sidebar--expanded {
      left: 0;
      right: auto;
    }

    [dir="rtl"] .sidebar--expanding {
      /* Carbon motion tokens: motion.$duration-fast-01 (70ms) and motion.$duration-moderate-02 (400ms) with motion.motion(standard, productive) */
      transition:
        left 70ms cubic-bezier(0.2, 0, 0.38, 0.9),
        width 400ms cubic-bezier(0.2, 0, 0.38, 0.9),
        visibility 0s 70ms;
    }

    [dir="rtl"] .sidebar--contracting {
      /* Carbon motion tokens: motion.$duration-fast-01 (70ms) and motion.$duration-moderate-02 (400ms) with motion.motion(standard, productive) */
      transition:
        left 70ms cubic-bezier(0.2, 0, 0.38, 0.9),
        width 400ms cubic-bezier(0.2, 0, 0.38, 0.9),
        visibility 0s 70ms;
    }

    [dir="rtl"] .sidebar--closing {
      left: calc(calc(320px + 1rem) * -1);
      width: 320px;
    }

    [dir="rtl"] .sidebar--closed {
      right: auto;
      left: calc(calc(320px + 1rem) * -1);
      width: 320px;
      /* Carbon motion token: motion.$duration-fast-01 (70ms) with motion.motion(standard, productive) */
      transition:
        left 70ms cubic-bezier(0.2, 0, 0.38, 0.9),
        visibility 0s 0s;
    }
  `;

  @property({ type: Object })
  accessor settings!: Settings;

  @property({ type: Object })
  accessor config!: PublicConfig;

  @property({ type: Object })
  accessor onChatInstanceReady: ((instance: ChatInstance) => void) | undefined =
    undefined;

  @state()
  accessor sideBarOpen: boolean = false;

  @state()
  accessor sideBarClosing: boolean = false;

  @state()
  accessor workspaceExpanded: boolean = false;

  @state()
  accessor workspaceAnimating: "expanding" | "contracting" | null = null;

  @state()
  accessor instance!: ChatInstance;

  @state()
  accessor userDefinedSlotsMap: UserDefinedSlotsMap = {};

  @state()
  accessor valueFromParent: string = Date.now().toString();

  private _interval?: ReturnType<typeof setInterval>;

  protected firstUpdated(_changedProperties: PropertyValues): void {
    this._interval = setInterval(() => {
      this.valueFromParent = Date.now().toString();
    }, 1500);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._interval) {
      clearInterval(this._interval);
    }
  }

  /**
   * Listens for view changes on the AI chat.
   */
  onViewPreChange = async (
    event: BusEventViewPreChange,
    _instance: ChatInstance,
  ) => {
    if (!event.newViewState.mainWindow) {
      this.sideBarClosing = true;
      // In production, should really be using AnimationEvent event here instead of a hard coded timeout.
      await sleep(250);
    }
  };

  /**
   * Listens for view changes on the AI chat.
   */
  onViewChange = (event: BusEventViewChange, _instance: ChatInstance) => {
    if (event.newViewState.mainWindow) {
      this.sideBarOpen = true;
    } else {
      this.sideBarOpen = false;
      this.sideBarClosing = false;
    }
  };

  /**
   * Closes/hides the chat.
   */
  openSideBar = () => {
    this.instance?.changeView(ViewType.MAIN_WINDOW);
  };

  /**
   * Listens for clicks from buttons with custom events attached.
   */
  customButtonHandler = (event: BusEvent) => {
    const { messageItem } = event as BusEventMessageItemCustom;
    // The 'custom_event_name' property comes from the button response type with button_type of custom_event.
    if (messageItem.custom_event_name === "alert_button") {
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

    // Notify parent component that instance is ready
    this.onChatInstanceReady?.(instance);

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

    // Listen for workspace pre-open event to expand sidebar
    this.instance.on({
      type: BusEventType.WORKSPACE_PRE_OPEN,
      handler: () => {
        if (this.settings.layout === "sidebar") {
          console.log("Web Component: Expanding sidebar - workspace opening");
          this.workspaceAnimating = "expanding";
          this.workspaceExpanded = true;
        }
      },
    });

    // Listen for workspace pre-close event to contract sidebar
    this.instance.on({
      type: BusEventType.WORKSPACE_PRE_CLOSE,
      handler: () => {
        if (this.settings.layout === "sidebar") {
          console.log("Web Component: Contracting sidebar - workspace closing");
          this.workspaceAnimating = "contracting";
          this.workspaceExpanded = false;
        }
      },
    });
  };

  /**
   * Each user defined event is tied to a slot deeply rendered with-in AI chat that is generated at runtime.
   * Here we make sure we store all these slots along with their relevant data in order to be able to dynamically
   * render the content to be slotted when this.renderUserDefinedSlots() is called in the render function.
   */
  userDefinedHandler = (event: any) => {
    const { data } = event;

    // Initialize or update the slot
    const existingSlot = this.userDefinedSlotsMap[data.slot];
    const isStreaming = Boolean(data.chunk);

    if (isStreaming && data.messageItem) {
      // For streaming, accumulate partial items
      const existingPartialItems = existingSlot?.partialItems || [];
      const newPartialItems = [...existingPartialItems, data.messageItem];
      this.userDefinedSlotsMap[data.slot] = {
        streaming: Boolean(newPartialItems.length),
        message: data.message,
        fullMessage: data.fullMessage,
        messageItem: data.messageItem,
        partialItems: newPartialItems,
      };
    } else {
      // For complete responses
      this.userDefinedSlotsMap[data.slot] = {
        streaming: Boolean(existingSlot?.partialItems?.length),
        message: data.message,
        fullMessage: data.fullMessage,
        messageItem: data.messageItem,
        partialItems: existingSlot?.partialItems,
      };
    }

    this.requestUpdate();
  };

  /**
   * This renders each of the dynamically generated slots that were generated by the AI chat by calling
   * this.renderUserDefinedResponse on each one.
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
   */
  renderUserDefinedResponse(slot: keyof UserDefinedSlotsMap) {
    const { message } = this.userDefinedSlotsMap[slot];

    const userDefinedMessage = message as UserDefinedItem;

    // Check the "type" we have used as our key.
    switch (userDefinedMessage.user_defined?.user_defined_type) {
      case "green":
        // And here is an example using your own component.
        return html`<div slot=${slot}>
          <user-defined-response-example
            .text=${userDefinedMessage.user_defined.text as string}
            .valueFromParent=${this.valueFromParent}
          ></user-defined-response-example>
        </div>`;
      default:
        return null;
    }
  }

  /**
   * Here we process a single item from this.userDefinedSlotsMap. We go ahead and use a switch statement to decide
   * which element we should be rendering.
   */
  renderUserDefinedChunk(slot: keyof UserDefinedSlotsMap) {
    const { messageItem, partialItems } = this.userDefinedSlotsMap[slot];

    if (partialItems && partialItems.length > 0) {
      switch (partialItems[0].user_defined?.user_defined_type) {
        case "green": {
          // The partial members are not concatenated, you get a whole array of chunks so you can special handle
          // concatenation as you want.
          const text = partialItems
            .map((item) => item.user_defined?.text)
            .join("");
          return html`<div slot=${slot}>
            <user-defined-response-example
              .text=${text}
              .valueFromParent=${this.valueFromParent}
            ></user-defined-response-example>
          </div>`;
        }
        default: {
          // Default to just showing a skeleton state for user_defined responses types we don't want to have special
          // streaming behavior for.
          return html`<div slot=${slot}>
            <cds-ai-skeleton-text></cds-ai-skeleton-text>
          </div>`;
        }
      }
    }

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
   * Workspace panel element is now using the workspace-writeable-element-example component. and we render it with custom example for demo purpose. but remember its a custom writeable element.
   */
  renderWriteableElementSlots() {
    const ALWAYS_RENDER_KEYS = ["workspacePanelElement"];
    const elements = this.instance?.writeableElements ?? {};

    const keys =
      this.settings.writeableElements === "true"
        ? Object.keys(elements)
        : this.config.homescreen?.customContentOnly
          ? ["homeScreenHeaderBottomElement", "homeScreenAfterStartersElement"]
          : [];

    const finalKeys = [
      ...ALWAYS_RENDER_KEYS,
      ...keys.filter((k) => !ALWAYS_RENDER_KEYS.includes(k)),
    ];

    return finalKeys.map(
      (key) => html`
        <div slot=${key}>
          ${key === "workspacePanelElement"
            ? html`
                <workspace-writeable-element-example
                  location=${key}
                  .instance=${this.instance}
                  .valueFromParent=${this.valueFromParent}
                ></workspace-writeable-element-example>
              `
            : html`
                <writeable-element-example
                  location=${key}
                  valueFromParent=${this.valueFromParent}
                ></writeable-element-example>
              `}
        </div>
      `,
    );
  }

  handleTransitionEnd = (event: TransitionEvent) => {
    // Only handle width transitions on the chat element itself
    if (
      event.propertyName === "width" &&
      event.target === event.currentTarget
    ) {
      this.workspaceAnimating = null;
    }
  };

  getSideBarClassName() {
    let className = "sidebar";
    if (this.workspaceExpanded) {
      className += " sidebar--expanded";
    }
    if (this.workspaceAnimating === "expanding") {
      className += " sidebar--expanding";
    } else if (this.workspaceAnimating === "contracting") {
      className += " sidebar--contracting";
    }
    if (this.sideBarClosing) {
      className += " sidebar--closing";
    } else if (!this.sideBarOpen) {
      className += " sidebar--closed";
    }
    return className;
  }

  // Depending on which layout is setting in settings, render the right version of AI chat.
  render() {
    return html`
      ${this.settings.layout === "float"
        ? html`<cds-aichat-container
            .config=${this.config}
            .onError=${this.config.onError}
            .openChatByDefault=${this.config.openChatByDefault ?? undefined}
            .disclaimer=${this.config.disclaimer}
            .disableCustomElementMobileEnhancements=${this.config
              .disableCustomElementMobileEnhancements ?? undefined}
            .debug=${this.config.debug ?? undefined}
            .injectCarbonTheme=${this.config.injectCarbonTheme ?? undefined}
            .aiEnabled=${this.config.aiEnabled ?? undefined}
            .shouldTakeFocusIfOpensAutomatically=${this.config
              .shouldTakeFocusIfOpensAutomatically ?? undefined}
            .namespace=${this.config.namespace ?? undefined}
            .shouldSanitizeHTML=${this.config.shouldSanitizeHTML ?? undefined}
            .header=${this.config.header}
            .layout=${this.config.layout}
            .messaging=${this.config.messaging}
            .isReadonly=${this.config.isReadonly ?? undefined}
            .persistFeedback=${this.config.persistFeedback ?? undefined}
            .assistantName=${this.config.assistantName}
            locale=${this.config.locale}
            .homescreen=${this.config.homescreen}
            .launcher=${this.config.launcher}
            .onBeforeRender=${this.onBeforeRender}
            .serviceDeskFactory=${serviceDeskFactory}
            >${this.renderUserDefinedSlots()}${this.renderWriteableElementSlots()}</cds-aichat-container
          >`
        : html``}
      ${this.settings.layout === "sidebar"
        ? html`<cds-aichat-custom-element
            class=${this.getSideBarClassName()}
            @transitionend=${this.handleTransitionEnd}
            .config=${this.config}
            .onError=${this.config.onError}
            .openChatByDefault=${this.config.openChatByDefault ?? undefined}
            .disclaimer=${this.config.disclaimer}
            .disableCustomElementMobileEnhancements=${this.config
              .disableCustomElementMobileEnhancements ?? undefined}
            .debug=${this.config.debug ?? undefined}
            .injectCarbonTheme=${this.config.injectCarbonTheme ?? undefined}
            .aiEnabled=${this.config.aiEnabled ?? undefined}
            .shouldTakeFocusIfOpensAutomatically=${this.config
              .shouldTakeFocusIfOpensAutomatically ?? undefined}
            .namespace=${this.config.namespace ?? undefined}
            .shouldSanitizeHTML=${this.config.shouldSanitizeHTML ?? undefined}
            .header=${this.config.header}
            .layout=${this.config.layout}
            .messaging=${this.config.messaging}
            .isReadonly=${this.config.isReadonly ?? undefined}
            .persistFeedback=${this.config.persistFeedback ?? undefined}
            .assistantName=${this.config.assistantName}
            locale=${this.config.locale}
            .homescreen=${this.config.homescreen}
            .launcher=${this.config.launcher}
            .onBeforeRender=${this.onBeforeRender}
            .onViewPreChange=${this.onViewPreChange}
            .onViewChange=${this.onViewChange}
            .serviceDeskFactory=${serviceDeskFactory}
            >${this.renderUserDefinedSlots()}${this.renderWriteableElementSlots()}</cds-aichat-custom-element
          >`
        : html``}
      ${this.settings.layout === "fullscreen" ||
      this.settings.layout === "fullscreen-no-gutter"
        ? html`<cds-aichat-custom-element
            class="fullScreen"
            .config=${this.config}
            .onError=${this.config.onError}
            .openChatByDefault=${this.config.openChatByDefault ?? undefined}
            .disclaimer=${this.config.disclaimer}
            .disableCustomElementMobileEnhancements=${this.config
              .disableCustomElementMobileEnhancements ?? undefined}
            .debug=${this.config.debug ?? undefined}
            .injectCarbonTheme=${this.config.injectCarbonTheme ?? undefined}
            .aiEnabled=${this.config.aiEnabled ?? undefined}
            .shouldTakeFocusIfOpensAutomatically=${this.config
              .shouldTakeFocusIfOpensAutomatically ?? undefined}
            .namespace=${this.config.namespace ?? undefined}
            .shouldSanitizeHTML=${this.config.shouldSanitizeHTML ?? undefined}
            .header=${this.config.header}
            .layout=${this.config.layout}
            .messaging=${this.config.messaging}
            .isReadonly=${this.config.isReadonly ?? undefined}
            .assistantName=${this.config.assistantName}
            locale=${this.config.locale}
            .homescreen=${this.config.homescreen}
            .launcher=${this.config.launcher}
            .onBeforeRender=${this.onBeforeRender}
            .serviceDeskFactory=${serviceDeskFactory}
            >${this.renderUserDefinedSlots()}${this.renderWriteableElementSlots()}</cds-aichat-custom-element
          >`
        : html``}
    `;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-app": DemoApp;
  }
}
