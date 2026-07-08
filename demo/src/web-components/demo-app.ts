/*
 *  Copyright IBM Corp. 2025, 2026
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
import "./custom-footer-example";
import "./writeable-element-example";
import "./workspace-writeable-element-example";
import "./history-writeable-element-example";
import "./explainability-popover-example";

import {
  BusEvent,
  BusEventMessageItemCustom,
  BusEventType,
  BusEventViewChange,
  BusEventViewPreChange,
  ChatInstance,
  GenericItem,
  PublicConfig,
  RenderUserDefinedState,
  ServiceDesk,
  ServiceDeskFactoryParameters,
  UserDefinedItem,
  ViewType,
} from "@carbon/ai-chat";
// Raw CSS text of the shipped sidebar layout. demo-app keeps its shadow DOM, so
// the compiled stylesheet is imported as a string (webpack `?raw` loader) and
// adopted into `static styles` below via `unsafeCSS`.
import sidebarLayoutCss from "@carbon/ai-chat/css/chat-sidebar-layout.css?raw";
import { css, html, LitElement, PropertyValues, unsafeCSS } from "lit";
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

interface CustomFooterSlotsMap {
  [key: string]: CustomFooterSlot;
}

interface CustomFooterSlot {
  messageItem: GenericItem;
  additionalData?: Record<string, unknown>;
}

/**
 * `DemoApp` is a custom Lit element representing usage of AI chat with a web component.
 */
@customElement("demo-app")
export class DemoApp extends LitElement {
  static styles = [
    // Base / closing / closed sidebar positioning shipped by @carbon/ai-chat.
    unsafeCSS(sidebarLayoutCss),
    css`
      :host {
        /* Tuck the docked sidebar below the demo's 48px header. */
        --cds-aichat-sidebar-inset-block-start: 48px;
      }

      cds-ai-skeleton-placeholder {
        width: 100%;
      }

      .fullScreen {
        position: fixed;
        bottom: 0;
        inset-inline-end: 0;
        height: calc(100vh - 48px);
        width: calc(100vw - 320px - 2rem);
        z-index: 9999;
      }

      /* Workspace expansion: widen the panel to make room for the workspace UI.
         The 320px gutter is the demo's config nav-block width. */
      .cds-aichat-sidebar--expanded {
        width: calc(100vw - 320px - 2rem);
      }

      /* While expanding / contracting, transition width alongside the open/close
         slide. inset-inline-end keeps the slide correct in RTL; width is
         direction-agnostic and is what the transitionend handler watches for.
         Carbon motion tokens: motion.$duration-moderate-02 (240ms) and
         motion.$duration-slow-01 (400ms) with motion.motion(standard, productive). */
      .cds-aichat-sidebar--expanding,
      .cds-aichat-sidebar--contracting {
        transition:
          inset-inline-end 240ms cubic-bezier(0.2, 0, 0.38, 0.9),
          width 400ms cubic-bezier(0.2, 0, 0.38, 0.9);
      }

      /* Collapse the panel back to its base width while it slides out, so an
         expanded panel does not slide off-screen at full expanded width. */
      .cds-aichat-sidebar--closing,
      .cds-aichat-sidebar--closed {
        width: var(--cds-aichat-sidebar-width, 360px);
      }
    `,
  ];

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
  accessor customFooterSlotsMap: CustomFooterSlotsMap = {};

  @state()
  accessor valueFromParent: string = Date.now().toString();

  /**
   * Tracks user-defined-response elements created by the callback so we can
   * push parent-state updates (like valueFromParent) to them reactively.
   */
  private _userDefinedElements = new Set<HTMLElement>();

  private _interval?: ReturnType<typeof setInterval>;

  protected firstUpdated(_changedProperties: PropertyValues): void {
    // Mirrors DemoApp.tsx: continuously updates parent state to exercise live
    // host-state propagation. Skipped via `?disableParentStateTimer` so the
    // chat's render performance can be profiled without this constant noise.
    if (
      new URLSearchParams(window.location.search).has("disableParentStateTimer")
    ) {
      return;
    }
    this._interval = setInterval(() => {
      this.valueFromParent = Date.now().toString();
    }, 1500);
  }

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("valueFromParent")) {
      for (const el of this._userDefinedElements) {
        if (!el.isConnected) {
          this._userDefinedElements.delete(el);
          continue;
        }
        (el as any).valueFromParent = this.valueFromParent;
      }
    }
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
    // User defined responses are handled by the renderUserDefinedResponse callback
    // on the container/custom-element, so no manual event handlers needed here.
    this.instance.on({
      type: BusEventType.CUSTOM_FOOTER_SLOT,
      handler: this.customFooterHandler,
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

    // Listen for when new chat option is selected from the chat header overflow menu
    instance.on({
      type: BusEventType.HISTORY_PANEL_NEW_CHAT,
      handler: () => window.alert("Creating new chat from header menu"),
    });
  };

  /**
   * Callback to render user_defined responses. The library manages event listening, slot tracking,
   * streaming state, and element lifecycle. We just return an HTMLElement.
   *
   * We track created elements in _userDefinedElements so parent state like valueFromParent
   * can be pushed to them reactively via updated().
   */
  renderUserDefinedCallback = (
    state: RenderUserDefinedState,
  ): HTMLElement | null => {
    // Handle streaming — show partial content as it arrives
    if (state.partialItems?.length) {
      const firstChunk = state.partialItems[0] as DeepPartial<UserDefinedItem>;
      switch (firstChunk.user_defined?.user_defined_type) {
        case "green": {
          const text = state.partialItems
            .map(
              (item: DeepPartial<GenericItem>) =>
                (item as DeepPartial<UserDefinedItem>).user_defined?.text,
            )
            .join("");
          const el = document.createElement(
            "user-defined-response-example",
          ) as any;
          el.text = text;
          el.valueFromParent = this.valueFromParent;
          this._userDefinedElements.add(el);
          return el;
        }
        default:
          // Show skeleton for unknown streaming types
          return document.createElement("cds-ai-skeleton-text");
      }
    }

    // Handle complete responses
    if (state.messageItem) {
      const userDefinedMessage = state.messageItem as UserDefinedItem;
      switch (userDefinedMessage.user_defined?.user_defined_type) {
        case "green": {
          const el = document.createElement(
            "user-defined-response-example",
          ) as any;
          el.text = userDefinedMessage.user_defined.text as string;
          el.valueFromParent = this.valueFromParent;
          this._userDefinedElements.add(el);
          return el;
        }
        default:
          return null;
      }
    }

    return null;
  };

  /**
   * Each custom footer event is tied to a slot deeply rendered with-in AI chat that is generated at runtime.
   * Here we make sure we store all these slots along with their relevant data in order to be able to dynamically
   * render the content to be slotted when this.renderCustomFooterSlots() is called in the render function.
   */
  customFooterHandler = (event: any) => {
    const { data } = event;

    this.customFooterSlotsMap[data.slotName] = {
      messageItem: data.messageItem,
      additionalData: data.additionalData,
    };

    this.requestUpdate();
  };

  /**
   * This renders each of the slots that were generated by the AI chat.
   */
  renderCustomFooterSlots() {
    const customFooterSlotsKeyArray = Object.keys(this.customFooterSlotsMap);

    return customFooterSlotsKeyArray.map((slotName) => {
      const { messageItem, additionalData } =
        this.customFooterSlotsMap[slotName];

      return html`<div slot=${slotName}>
        <custom-footer-example
          .messageItem=${messageItem}
          .additionalData=${additionalData}
        ></custom-footer-example>
      </div>`;
    });
  }

  /**
   * You only need to provide the slots you want to use. In this demo, we fill them all with big
   * green boxes.
   *
   * Workspace panel element is now using the workspace-writeable-element-example component. and we render it with custom example for demo purpose. but remember its a custom slot.
   */
  renderWriteableElementSlots() {
    const ALWAYS_RENDER_KEYS = [
      "workspacePanelElement",
      "historyPanelElement",
      "explainabilityPopoverContent",
      "explainabilityPopoverActions",
    ];
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

    return finalKeys.map((key) => {
      switch (key) {
        case "explainabilityPopoverContent":
          return html`<div slot=${key}>
            <explainability-popover-content></explainability-popover-content>
          </div>`;
        case "explainabilityPopoverActions":
          return html`<div slot=${key}>
            <explainability-popover-actions></explainability-popover-actions>
          </div>`;
        case "workspacePanelElement":
          return html`<div slot=${key}>
            <workspace-writeable-element-example
              location=${key}
              .instance=${this.instance}
              .valueFromParent=${this.valueFromParent}
            ></workspace-writeable-element-example>
          </div>`;
        case "historyPanelElement":
          return html`<div slot=${key}>
            <history-writeable-element-example
              location=${key}
              .instance=${this.instance}
              .valueFromParent=${this.valueFromParent}
              .isMobile=${this.instance?.getState().customPanels.history
                .isMobile ?? false}
            ></history-writeable-element-example>
          </div>`;
        default:
          return html`<div slot=${key}>
            <writeable-element-example
              location=${key}
              valueFromParent=${this.valueFromParent}
            ></writeable-element-example>
          </div>`;
      }
    });
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
    // Compose the shipped `cds-aichat-sidebar` base class with the demo's
    // workspace expand/contract modifiers.
    let className = "cds-aichat-sidebar";
    if (this.workspaceExpanded) {
      className += " cds-aichat-sidebar--expanded";
    }
    if (this.workspaceAnimating === "expanding") {
      className += " cds-aichat-sidebar--expanding";
    } else if (this.workspaceAnimating === "contracting") {
      className += " cds-aichat-sidebar--contracting";
    }
    if (this.sideBarClosing) {
      className += " cds-aichat-sidebar--closing";
    } else if (!this.sideBarOpen) {
      className += " cds-aichat-sidebar--closed";
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
            .header=${{
              ...this.config.header,
              hideDefaultAiLabelContent: true,
            }}
            .layout=${this.config.layout}
            .messaging=${this.config.messaging}
            .isReadonly=${this.config.isReadonly ?? undefined}
            .persistFeedback=${this.config.persistFeedback ?? undefined}
            .hideAvatar=${this.config.hideAvatar ?? undefined}
            .assistantName=${this.config.assistantName}
            .assistantAvatarUrl=${this.config.assistantAvatarUrl}
            locale=${this.config.locale}
            .homescreen=${this.config.homescreen}
            .launcher=${this.config.launcher}
            .onBeforeRender=${this.onBeforeRender}
            .serviceDeskFactory=${serviceDeskFactory}
            .renderUserDefinedResponse=${this.renderUserDefinedCallback}
            >${this.renderWriteableElementSlots()}${this.renderCustomFooterSlots()}</cds-aichat-container
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
            .header=${{
              ...this.config.header,
              hideDefaultAiLabelContent: true,
            }}
            .layout=${this.config.layout}
            .messaging=${this.config.messaging}
            .isReadonly=${this.config.isReadonly ?? undefined}
            .persistFeedback=${this.config.persistFeedback ?? undefined}
            .hideAvatar=${this.config.hideAvatar ?? undefined}
            .assistantName=${this.config.assistantName}
            .assistantAvatarUrl=${this.config.assistantAvatarUrl}
            locale=${this.config.locale}
            .homescreen=${this.config.homescreen}
            .launcher=${this.config.launcher}
            .onBeforeRender=${this.onBeforeRender}
            .onViewPreChange=${this.onViewPreChange}
            .onViewChange=${this.onViewChange}
            .serviceDeskFactory=${serviceDeskFactory}
            .renderUserDefinedResponse=${this.renderUserDefinedCallback}
            >${this.renderWriteableElementSlots()}${this.renderCustomFooterSlots()}</cds-aichat-custom-element
          >`
        : html``}
      ${this.settings.layout === "fullscreen"
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
            .header=${{
              ...this.config.header,
              hideDefaultAiLabelContent: true,
            }}
            .layout=${this.config.layout}
            .messaging=${this.config.messaging}
            .isReadonly=${this.config.isReadonly ?? undefined}
            .assistantName=${this.config.assistantName}
            .assistantAvatarUrl=${this.config.assistantAvatarUrl}
            locale=${this.config.locale}
            .homescreen=${this.config.homescreen}
            .launcher=${this.config.launcher}
            .onBeforeRender=${this.onBeforeRender}
            .serviceDeskFactory=${serviceDeskFactory}
            .renderUserDefinedResponse=${this.renderUserDefinedCallback}
            .hideAvatar=${this.config.hideAvatar ?? undefined}
            >${this.renderWriteableElementSlots()}${this.renderCustomFooterSlots()}</cds-aichat-custom-element
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
