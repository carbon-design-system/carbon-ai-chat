/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cx from "classnames";
import FocusTrap from "focus-trap-react";
import React, { Component, MutableRefObject, RefObject } from "react";
import { useSelector } from "../../hooks/useSelector";

import BotChat, { ChatClass } from "../BotChat";
import { HydrationPanel } from "../HydrationPanel";
import { InputFunctions } from "../input/Input";
import { MessageTypeComponent } from "../MessageTypeComponent";

import { OverlayPanel, OverlayPanelName } from "../OverlayPanel";
import { CustomPanel } from "../panels/CustomPanel";
import { HideComponent } from "../util/HideComponent";
import VisuallyHidden from "../util/VisuallyHidden";
import { ModalPortalRootProvider } from "../../providers/ModalPortalRootProvider";
import {
  HasServiceManager,
  withServiceManager,
} from "../../hocs/withServiceManager";
import actions from "../../store/actions";
import CDSButton from "@carbon/web-components/es/components/button/button.js";
import {
  selectHumanAgentDisplayState,
  selectInputState,
  selectIsInputToHumanAgent,
} from "../../store/selectors";
import {
  AnimationInType,
  AnimationOutType,
} from "../../../types/utilities/Animation";
import {
  AppState,
  ChatWidthBreakpoint,
  ViewType,
} from "../../../types/state/AppState";
import { AutoScrollOptions } from "../../../types/utilities/HasDoAutoScroll";
import { HasRequestFocus } from "../../../types/utilities/HasRequestFocus";
import { IS_IOS, IS_MOBILE, isBrowser } from "../../utils/browserUtils";
import { CornersType } from "../../utils/constants";
import { doFocusRef, SCROLLBAR_WIDTH } from "../../utils/domUtils";
import { arrayLastValue } from "../../utils/lang/arrayUtils";
import {
  createMessageRequestForChoice,
  createMessageRequestForText,
} from "../../utils/messageUtils";
import { consoleError, createDidCatchErrorData } from "../../utils/miscUtils";
import { MainWindowFunctions } from "./MainWindowFunctions";
import {
  MainWindowCloseReason,
  MessageSendSource,
} from "../../../types/events/eventBusTypes";
import { SendOptions } from "../../../types/instance/ChatInstance";
import { ButtonItem, SingleOption } from "../../../types/messaging/Messages";
import CatastrophicError from "../CatastrophicError";
import Disclaimer from "../Disclaimer";
import HomeScreenContainer from "../homeScreen/HomeScreenContainer";
import IFramePanel from "../responseTypes/iframe/IFramePanel";
import ViewSourcePanel from "../responseTypes/util/citations/ViewSourcePanel";
import BodyAndFooterPanelComponent from "../panels/BodyAndFooterPanelComponent";
import { CarbonTheme } from "../../../types/config/PublicConfig";
import Layer from "../../components/carbon/Layer";

// Indicates the messages container is at the standard, default width.
const WIDTH_BREAKPOINT_STANDARD = "cds-aichat--standard-width";

// Indicates the messages container is at a narrow width breakpoint (small phones).
const WIDTH_BREAKPOINT_NARROW = "cds-aichat--narrow-width";

// Indicates the messages container is at a wide width breakpoint.
const WIDTH_BREAKPOINT_WIDE = "cds-aichat--wide-width";

interface MainWindowOwnProps extends HasServiceManager {
  /**
   * By default, Carbon AI Chat will create its own host element. If PublicConfig.element is set, we use the element provided
   * instead and render Carbon AI Chat there.
   */
  useCustomHostElement: boolean;

  /**
   * The mutable ref object for accessing the main window functions.
   */
  mainWindowRef: MutableRefObject<MainWindowFunctions>;
}

interface MainWindowState {
  open: boolean;
  closing: boolean;

  /**
   * This is a reference to the Element that acts as the host for elements from {@link ModalPortal}. We set this in
   * state instead of a class property to make sure the component re-renders and the context is updated with this
   * value after the component is mounted.
   */
  modalPortalHostElement: Element;

  /**
   * Counter to track if there are any panels open. If this is 0, the regular bot content will be visible.
   */
  numPanelsOpen: number;

  /**
   * Counter to track if there are any panels that are animating. If this is 0, the regular bot content will be visible.
   */
  numPanelsAnimating: number;

  /**
   * Indicates the number of panels that are open that want to display a background cover on top of the main window.
   */
  numPanelsCovering: number;

  /**
   * When the hydration animation is complete, the home screen kicks off secondary loading characteristics.
   */
  isHydrationAnimationComplete: boolean;

  /**
   * In the tooling we don't want to have focus automatically set because it makes the page scroll to the Carbon AI Chat.
   * It's possible that because we have a changing behavior here (we used to not focus if people rendered to an
   * element), this will end up having its initial state set by a public config option.
   */
  shouldAutoFocus: boolean;
}

type MainWindowProps = MainWindowOwnProps & AppState;

class MainWindow
  extends Component<MainWindowProps, MainWindowState>
  implements MainWindowFunctions
{
  /**
   * Default state.
   */
  public readonly state: Readonly<MainWindowState> = {
    closing: false,
    open: this.props.persistedToBrowserStorage.viewState.mainWindow,
    modalPortalHostElement: null,
    numPanelsOpen: 0,
    numPanelsAnimating: 0,
    numPanelsCovering: 0,
    isHydrationAnimationComplete: this.props.isHydrated,
    shouldAutoFocus:
      this.props.config.public.shouldTakeFocusIfOpensAutomatically,
  };

  /**
   * A React ref to the "cds-aichat--main-window" element.
   */
  private mainWindowRef = React.createRef<HTMLDivElement>();

  /**
   * A React ref to the "cds-aichat--widget" element.
   */
  private containerRef = React.createRef<HTMLDivElement>();

  /**
   * A React ref to the bot {@link Chat} component.
   */
  private botChatRef: RefObject<ChatClass> = React.createRef();

  /**
   * A React ref to the bot {@link Input} component.
   */
  private homeScreenInputRef: RefObject<InputFunctions> = React.createRef();

  /**
   * A React ref to the bot {@link Disclaimer} component.
   */
  private disclaimerRef: RefObject<CDSButton> = React.createRef();

  /**
   * A React ref to the animation container element.
   */
  private animationContainerRef: RefObject<HTMLDivElement> = React.createRef();

  /**
   * A React ref to the {@link IFramePanel} component.
   */
  private iframePanelRef: RefObject<HasRequestFocus> = React.createRef();

  /**
   * A React ref to the {@link ViewSourcePanel}.
   */
  private viewSourcePanelRef: RefObject<HasRequestFocus> = React.createRef();

  /**
   * The previous value of the body "visibility" property before the widget was opened.
   */
  private previousBodyVisibility: string = undefined;

  /**
   * The previous value of the body "position" property before the widget was opened.
   */
  private previousBodyPosition: string = undefined;

  /**
   * The observer used to monitor for changes in the main window size.
   */
  private mainWindowObserver: ResizeObserver;

  componentDidMount() {
    const { config, serviceManager, mainWindowRef } = this.props;
    const { public: publicConfig } = config;

    serviceManager.mainWindow = this;
    mainWindowRef.current = this;

    this.mainWindowObserver = new ResizeObserver(this.onResize);
    this.mainWindowObserver.observe(this.containerRef.current);

    if (IS_MOBILE && !publicConfig.disableCustomElementMobileEnhancements) {
      const { visualViewport } = window;
      if (visualViewport) {
        visualViewport.addEventListener("resize", this.onVisualViewportResize);
        visualViewport.addEventListener(
          "scroll",
          this.updateFromVisualViewport,
        );
      }

      // For devices that don't support the visual viewport we'll set some default values anyway.
      this.updateFromVisualViewport();
      this.updateBody(false);
    }

    // Make the scrollbar width available to CSS.
    this.containerRef.current.style.setProperty(
      "--cds-aichat-scrollbar-width",
      `${SCROLLBAR_WIDTH()}px`,
    );
  }

  componentWillUnmount(): void {
    // Remove the listeners and observer we added previously.
    this.mainWindowObserver.unobserve(this.containerRef.current);
  }

  /**
   * This will check to see if the messages list is anchored to the bottom of the panel and if so, ensure that the
   * list is still scrolled to the bottom. It will also set the classname appropriate to the current width.
   */
  private onResize = () => {
    let appChatWidthBreakpoint;

    const height = this.containerRef?.current?.offsetHeight;
    const width = this.containerRef?.current?.offsetWidth;
    // The minimum width of the wide size + 1rem of padding on each side.
    if (width >= 672 + 16 + 16) {
      appChatWidthBreakpoint = ChatWidthBreakpoint.WIDE;
    } else if (width >= 360) {
      appChatWidthBreakpoint = ChatWidthBreakpoint.STANDARD;
    } else {
      appChatWidthBreakpoint = ChatWidthBreakpoint.NARROW;
    }
    this.props.serviceManager.store.dispatch(
      actions.setAppStateValue("chatWidth", width),
    );
    this.props.serviceManager.store.dispatch(
      actions.setAppStateValue("chatHeight", height),
    );
    this.props.serviceManager.store.dispatch(
      actions.setAppStateValue("chatWidthBreakpoint", appChatWidthBreakpoint),
    );
  };

  componentDidUpdate(
    oldProps: Readonly<MainWindowProps>,
    oldState: Readonly<MainWindowState>,
  ) {
    const newProps = this.props;
    const newState = this.state;

    const { persistedToBrowserStorage, useCustomHostElement } = newProps;
    const { viewState } = persistedToBrowserStorage;
    const { open } = newState;
    const prevViewState = oldProps.persistedToBrowserStorage.viewState;

    if (viewState.mainWindow !== prevViewState.mainWindow) {
      // If viewState.mainWindow has changed then perform the necessary updates.
      this.updateBody(false);
      this.updateFromVisualViewport();
    }

    if (oldProps.isHydrated !== newProps.isHydrated && newProps.isHydrated) {
      // If isHydrated has changed and isHydrated is true  we can go ahead and request focus on the active panel.
      this.setState({ isHydrationAnimationComplete: true }, () => {
        requestAnimationFrame(() => {
          this.requestFocus();
        });
      });
    }

    if (viewState.mainWindow && (!prevViewState.mainWindow || !open)) {
      // If the main Carbon AI Chat window is now open, and it was not previously then perform the necessary updates.
      // See https://reactjs.org/docs/react-component.html#componentdidupdate.
      this.setState({ open: true }, () => {
        this.requestFocus();
      });
    } else if (
      !viewState.mainWindow &&
      prevViewState.mainWindow &&
      oldState.open &&
      open
    ) {
      // If the main Carbon AI Chat window was previously open but is now no longer open then preform the necessary updates.
      // See https://reactjs.org/docs/react-component.html#componentdidupdate.
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ closing: true });
      if (useCustomHostElement) {
        this.removeChatFromDom();
      } else {
        this.containerRef.current.addEventListener(
          "animationend",
          this.removeChatFromDom,
        );
        this.requestFocus();
      }
    }

    if (newProps.config.public.shouldTakeFocusIfOpensAutomatically) {
      // This code is to prevent the widget from grabbing focus when a reset occurs. The autofocus value starts as
      // true but when we detect a reset, we turn the autofocus off until the user sends a message.
      if (
        !oldProps.persistedToBrowserStorage.hasSentNonWelcomeMessage &&
        newProps.persistedToBrowserStorage.hasSentNonWelcomeMessage &&
        !this.state.shouldAutoFocus
      ) {
        // eslint-disable-next-line react/no-did-update-set-state
        this.setState({ shouldAutoFocus: true });
      } else if (
        oldProps.botMessageState.localMessageIDs.length >
          newProps.botMessageState.localMessageIDs.length &&
        this.state.shouldAutoFocus
      ) {
        // If there are fewer messages than there were previously, we infer that the Carbon AI Chat has been restarted.
        // In that case, don't do any autofocusing.
        this.setState({ shouldAutoFocus: false });
      } else if (
        oldProps.botMessageState.localMessageIDs.length <
          newProps.botMessageState.localMessageIDs.length &&
        !this.state.shouldAutoFocus
      ) {
        // If a new message comes in, turn autofocusing back on.
        this.setState({ shouldAutoFocus: true });
      }
    }

    const newLastItemID = arrayLastValue(
      newProps.botMessageState.localMessageIDs,
    );
    const oldLastItemID = arrayLastValue(
      oldProps.botMessageState.localMessageIDs,
    );

    if (newLastItemID !== oldLastItemID && newState.shouldAutoFocus) {
      // The last item has changed. If it's not from history, then request focus.
      const lastMessageItem = newProps.allMessageItemsByID[newLastItemID];
      const lastMessage =
        newProps.allMessagesByID[lastMessageItem?.fullMessageID];
      if (!lastMessage?.ui_state_internal?.from_history) {
        this.requestFocus();
      }
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.serviceManager.actions.errorOccurred(
      createDidCatchErrorData("MainWindow", error, errorInfo, true),
    );
  }

  /**
   * This function will apply the necessary updates to the body element. This is primarily used to deal with
   * adjustments made to mobile devices.
   */
  updateBody(unmounting: boolean) {
    if (
      IS_IOS &&
      !this.props.config.public.disableCustomElementMobileEnhancements
    ) {
      if (isBrowser) {
        if (
          (window.screen.width <= 500 || window.screen.height <= 500) &&
          this.props.persistedToBrowserStorage.viewState.mainWindow &&
          !unmounting
        ) {
          this.previousBodyVisibility =
            document.body.style.getPropertyValue("visibility");
          this.previousBodyPosition =
            document.body.style.getPropertyValue("position");
          // On iOS devices when the keyboard is opened the viewport is immediately resized to the shorter view that is
          // visible between the navigation bar and the keyboard. However, this occurs before the keyboard has fully slid
          // into view. When the resize occurs we shrink the widget to the size of the viewport but this means that
          // during the animation the widget is too short and what is behind the widget becomes momentarily visible. To
          // deal with that we hide the body while the widget is open. For code searchability adding the words
          // "visibility: hidden !important" since that is how this styling is rendered on the body.
          document.body.style.setProperty("visibility", "hidden", "important");
          // To prevent the widget from being scrollable in a way that gets it into a bad state, we can set the body
          // to a fixed position. For code searchability adding the words "position: fixed !important" since that is how
          // this styling is rendered on the body.
          document.body.style.setProperty("position", "fixed", "important");
        } else {
          document.body.style.setProperty(
            "visibility",
            this.previousBodyVisibility,
          );
          document.body.style.setProperty(
            "position",
            this.previousBodyPosition,
          );
        }
      }
    }
  }

  /**
   * This is called when the visual viewport is resized.
   */
  onVisualViewportResize = () => {
    this.updateFromVisualViewport();
  };

  /**
   * The visual viewport is a relatively new API that provide this information about the actual visible area of the
   * browser. This takes into account things like the navigation bars and the keyboard. When the browser supports it
   * we can get more accurate about adjusting based on those things.
   */
  updateFromVisualViewport = () => {
    const element = this.props.serviceManager.container;
    const { visualViewport } = window;
    if (visualViewport) {
      // The viewport height is the visible area and the offset top is how much the viewport has been scrolled. The
      // viewport scrolling occurs on iOS devices when the keyboard is open but not on android.
      element.style.setProperty(
        "--cds-aichat-viewport-height",
        `${visualViewport.height}px`,
      );
      element.style.setProperty(
        "--cds-aichat-viewport-width",
        `${visualViewport.width}px`,
      );
      element.style.setProperty(
        "--cds-aichat-viewport-offsetTop",
        `${visualViewport.offsetTop}px`,
      );
      element.style.setProperty(
        "--cds-aichat-viewport-offsetLeft",
        `${visualViewport.offsetLeft}px`,
      );
    } else {
      // For browsers that don't support the visual viewport, for now we'll just settle on these values which only
      // sort of works.
      const height = "100vh";
      element.style.setProperty("--cds-aichat-viewport-height", height);
      element.style.setProperty("--cds-aichat-viewport-width", "100vw");
      element.style.setProperty("--cds-aichat-viewport-offsetTop", "0");
      element.style.setProperty("--cds-aichat-viewport-offsetLeft", "0");
    }
  };

  /**
   * Sets the element that is used as the host for {@link ModalPortal}.
   */
  setModalPortalHostElement = (ref: Element) => {
    if (this.state.modalPortalHostElement !== ref) {
      this.setState({ modalPortalHostElement: ref });
    }
  };

  onSendInput = async (
    text: string,
    source: MessageSendSource,
    options?: SendOptions,
  ) => {
    const isInputToHumanAgent = selectIsInputToHumanAgent(this.props);
    const { serviceManager } = this.props;
    const state = serviceManager.store.getState();
    const { files } = selectInputState(state);

    if (isInputToHumanAgent) {
      // If we're connected to an agent, then send the message to the agent instead of the bot.
      serviceManager.humanAgentService.sendMessageToAgent(text, files);
    } else {
      const messageRequest = createMessageRequestForText(text);

      serviceManager.actions.sendWithCatch(messageRequest, source, {
        ...options,
      });
    }

    if (files.length) {
      serviceManager.store.dispatch(
        actions.clearInputFiles(isInputToHumanAgent),
      );
    }
  };

  onSendHomeButtonInput = (input: SingleOption) => {
    const messageRequest = createMessageRequestForChoice(input);

    this.props.serviceManager.actions.sendWithCatch(
      messageRequest,
      MessageSendSource.HOME_SCREEN_STARTER,
    );
  };

  // When the animation is complete, we go ahead and set the state to remove chat from DOM
  removeChatFromDom = () => {
    this.containerRef.current.removeEventListener(
      "animationend",
      this.removeChatFromDom,
    );
    this.setState({
      open: false,
      closing: false,
    });
  };

  // Reset Carbon AI Chat to new session.
  onRestart = async () => {
    await this.props.serviceManager.actions.restartConversation();
    this.requestFocus();
  };

  // Close window.
  onClose = async () => {
    return this.doClose();
  };

  /**
   * Closes the main window.
   */
  async doClose() {
    const { serviceManager } = this.props;

    // Fire the view:change and window:close events. If the view change is canceled then the main window will stay open.
    await serviceManager.actions.changeView(ViewType.LAUNCHER, {
      mainWindowCloseReason: MainWindowCloseReason.DEFAULT_MINIMIZE,
    });
  }

  // No longer supports close-and-restart; use onClose and onRestart as separate actions

  /**
   * The callback that can be called to toggle between the home screen and the bot view.
   */
  onToggleHomeScreen = () => {
    this.props.serviceManager.store.dispatch(actions.toggleHomeScreen());
  };

  /**
   * Puts focus on the default focusable item for the current state of the application.
   */
  public requestFocus = () => {
    try {
      if (this.state.shouldAutoFocus && !IS_MOBILE) {
        // Put focus either on the input field or on the launcher button.
        if (this.getShowDisclaimer()) {
          if (this.disclaimerRef.current) {
            // Focus the disclaimer accept button.
            doFocusRef(this.disclaimerRef);
          }
        } else if (this.getShowHomeScreen()) {
          if (this.homeScreenInputRef.current) {
            // Focus the home screen input field. Must be on timeout because of the home screen's own internal animations.
            this.homeScreenInputRef.current.takeFocus();
          }
        } else if (this.props.iFramePanelState.isOpen) {
          if (this.iframePanelRef.current) {
            // Focus the iframe panel close button.
            this.iframePanelRef.current.requestFocus();
          }
        } else if (this.botChatRef.current) {
          // Focus the bot input field.
          this.botChatRef.current.requestInputFocus();
        }
      }
    } catch (error) {
      consoleError("An error occurred in MainWindow.requestFocus", error);
    }
  };

  /**
   * Note: This function relies on a lie which is  homeScreenState.isHomeScreenOpen which by default is true when store
   * is created based on whether Home Screen is enabled and only later updated to its real value after hydration.
   */
  private getShowHomeScreen() {
    return (
      this.props.config.public.homescreen?.isOn &&
      this.props.persistedToBrowserStorage.homeScreenState.isHomeScreenOpen &&
      !this.getShowDisclaimer()
    );
  }

  private getShowDisclaimer() {
    const hostname = isBrowser ? window.location.hostname : "localhost";
    return (
      this.props.config.public.disclaimer?.isOn &&
      !this.props.persistedToBrowserStorage.disclaimersAccepted[hostname]
    );
  }

  /**
   * Initiates a doAutoScroll on the currently visible chat panel.
   */
  public doAutoScroll(options?: AutoScrollOptions) {
    this.botChatRef?.current?.doAutoScroll(options);
  }

  /**
   * Returns the current scrollBottom value for the message scroll panel.
   */
  public getMessagesScrollBottom() {
    return this.botChatRef?.current?.getMessagesScrollBottom();
  }

  /**
   * Scrolls to the (full) message with the given ID. Since there may be multiple message items in a given
   * message, this will scroll the first message to the top of the message window.
   *
   * @param messageID The (full) message ID to scroll to.
   * @param animate Whether or not the scroll should be animated. Defaults to true.
   */
  public doScrollToMessage(messageID: string, animate = true) {
    this.botChatRef.current?.doScrollToMessage(messageID, animate);
  }

  /**
   * Called when the user starts or stops typing.
   */
  onUserTyping = (isTyping: boolean) => {
    if (
      this.props.serviceManager.store.getState().persistedToBrowserStorage
        .humanAgentState.isConnected
    ) {
      this.props.serviceManager.humanAgentService.userTyping(isTyping);
    }
  };

  /**
   * After accepting the disclaimer, we animate the disclaimer screen away.
   */
  onAcceptDisclaimer = () => {
    this.props.serviceManager.store.dispatch(actions.acceptDisclaimer());
  };

  /**
   * Update the panel counter to show a panel has opened, and add any proper focus.
   */
  onPanelOpenStart = (coverBackground: boolean) => {
    this.setState(
      (prevState) => ({
        numPanelsOpen: prevState.numPanelsOpen + 1,
        numPanelsAnimating: prevState.numPanelsAnimating + 1,
        numPanelsCovering:
          prevState.numPanelsCovering + (coverBackground ? 1 : 0),
      }),
      this.requestFocus,
    );
  };

  /**
   * Update the panel counter to show a panel has opened.
   */
  onPanelOpenEnd = () => {
    this.setState((prevState) => ({
      numPanelsAnimating: prevState.numPanelsAnimating - 1,
    }));
  };

  /**
   * Update the panel counter to show a panel has started to close.
   */
  onPanelCloseStart = () => {
    this.setState(
      (prevState) => ({ numPanelsAnimating: prevState.numPanelsAnimating + 1 }),
      this.requestFocus,
    );
  };

  /**
   * Update the panel counter to show a panel has started to close.
   */
  onPanelCloseEnd = (coverBackground: boolean) => {
    // TODO: Checking if the numPanelsOpen > 0 is a hack. It should never get there!
    this.setState((prevState) => ({
      numPanelsOpen:
        prevState.numPanelsOpen > 0 ? prevState.numPanelsOpen - 1 : 0,
      numPanelsAnimating: prevState.numPanelsAnimating - 1,
      numPanelsCovering:
        prevState.numPanelsCovering > 0
          ? prevState.numPanelsCovering - (coverBackground ? 1 : 0)
          : 0,
    }));
  };

  /**
   * Mark the hydration panel as closed with animation completed.
   */
  onHydrationPanelClose = () => {
    this.setState({ isHydrationAnimationComplete: true }, this.requestFocus);
  };

  /**
   * Returns the chat widget portion of the application.
   *
   * Note: If the home screen mini variation is to be displayed, the hydration panel shouldn't be rendered because
   * otherwise it appears for a split second before home screen is loaded.
   */
  renderChat() {
    const { isHydrated, config, chatWidthBreakpoint } = this.props;

    const showCovering =
      this.state.numPanelsCovering > 0 &&
      config.public.layout?.hasContentMaxWidth &&
      chatWidthBreakpoint === ChatWidthBreakpoint.WIDE;

    return (
      <div className="cds-aichat--widget--content">
        {this.renderCustomPanel()}
        {this.renderHydrationPanel()}
        {isHydrated && (
          <>
            {this.renderDisclaimerPanel()}
            {this.renderResponsePanel()}
            {this.renderHomeScreenPanel()}
            {this.renderIFramePanel()}
            {this.renderViewSourcePanel()}
            {showCovering && <div className="cds-aichat--background-cover" />}
            {this.renderBotChat()}
          </>
        )}
      </div>
    );
  }

  /**
   * Render the chat with the assistant.
   */
  renderBotChat() {
    const {
      config: {
        derived: { themeWithDefaults: theme, languagePack },
        public: { assistantName },
      },
      config,
      serviceManager,
      botMessageState,
      humanAgentState,
      allMessageItemsByID,
      isHydrated,
    } = this.props;
    const { numPanelsAnimating, numPanelsOpen, isHydrationAnimationComplete } =
      this.state;

    const inputState = selectInputState(this.props);
    const agentDisplayState = selectHumanAgentDisplayState(this.props);

    const showDisclaimer = this.getShowDisclaimer();
    let hideBotContainer: boolean;
    if (!isHydrationAnimationComplete) {
      // If the Hydration animation is still running then hide the bot container.
      hideBotContainer = true;
    } else if (numPanelsAnimating > 0) {
      // If any panel is animating then show the bot container for the duration of the animation.
      hideBotContainer = false;
    } else if (numPanelsOpen > 0) {
      // Otherwise if any panel is open than hide the bot container.
      hideBotContainer = true;
    }

    return (
      <HideComponent
        className="cds-aichat--bot-container"
        hidden={hideBotContainer}
      >
        <BotChat
          assistantName={assistantName}
          headerDisplayName={config.public.header?.name || assistantName}
          ref={this.botChatRef}
          languagePack={languagePack}
          config={config}
          serviceManager={serviceManager}
          onClose={this.onClose}
          messageState={botMessageState}
          onSendInput={(text: string) =>
            this.onSendInput(text, MessageSendSource.MESSAGE_INPUT)
          }
          humanAgentState={humanAgentState}
          agentDisplayState={agentDisplayState}
          allMessageItemsByID={allMessageItemsByID}
          onRestart={this.onRestart}
          isHydrated={isHydrated}
          isHydrationAnimationComplete={
            isHydrationAnimationComplete && !showDisclaimer
          }
          inputState={inputState}
          onToggleHomeScreen={this.onToggleHomeScreen}
          onUserTyping={this.onUserTyping}
          locale={config.public.locale || "en"}
          useAITheme={theme.aiEnabled}
          carbonTheme={theme.derivedCarbonTheme}
        />
      </HideComponent>
    );
  }

  renderInnerHydrationPanel() {
    const {
      botMessageState,
      serviceManager,
      persistedToBrowserStorage,
      config,
      config: {
        derived: { languagePack },
      },
    } = this.props;

    // We need to make an educated guess whether the home screen is going to be displayed after hydration is
    // complete, so we can show a version of the hydration panel that matches to avoid a flickering transition when
    // the hydration panel is only displayed very briefly. If the user's assistant session has expired, this will be
    // wrong, but it's rare enough to be not worth addressing.
    const homescreen = config.public.homescreen;
    const useHomeScreenVersion =
      homescreen?.isOn && !persistedToBrowserStorage.hasSentNonWelcomeMessage;
    const headerDisplayName =
      config.public.header?.name || config.public.assistantName;
    return (
      <HydrationPanel
        headerDisplayName={headerDisplayName}
        isHydrated={botMessageState.isHydratingCounter === 0}
        serviceManager={serviceManager}
        onClose={this.onClose}
        languagePack={languagePack}
        useHomeScreenVersion={useHomeScreenVersion}
      />
    );
  }

  /**
   * Render the panel with the loading state when we are hydrating the Carbon AI Chat.
   */
  renderHydrationPanel() {
    const {
      botMessageState,
      serviceManager,
      catastrophicErrorType,
      persistedToBrowserStorage,
    } = this.props;
    const { viewState } = persistedToBrowserStorage;

    return (
      <OverlayPanel
        onOpenStart={() => this.onPanelOpenStart(false)}
        onCloseStart={this.onPanelCloseStart}
        onOpenEnd={this.onPanelOpenEnd}
        onCloseEnd={() => {
          this.onHydrationPanelClose();
          this.onPanelCloseEnd(false);
        }}
        animationOnOpen={AnimationInType.NONE}
        animationOnClose={AnimationOutType.NONE}
        shouldOpen={
          botMessageState.isHydratingCounter > 0 &&
          !catastrophicErrorType &&
          viewState.mainWindow
        }
        shouldHide={false}
        serviceManager={serviceManager}
        overlayPanelName={OverlayPanelName.HYDRATING}
      >
        {this.renderInnerHydrationPanel()}
      </OverlayPanel>
    );
  }

  /**
   * Render the panel for when the Carbon AI Chat completely fails.
   */
  renderCatastrophicPanel() {
    const {
      serviceManager,
      config: {
        public: { assistantName },
        derived: { languagePack },
      },
    } = this.props;
    const headerDisplayName =
      this.props.config.public.header?.name ||
      this.props.config.public.assistantName;
    return (
      <OverlayPanel
        animationOnOpen={AnimationInType.NONE}
        animationOnClose={AnimationOutType.NONE}
        shouldOpen
        serviceManager={serviceManager}
        overlayPanelName={OverlayPanelName.CATASTROPHIC}
      >
        <CatastrophicError
          onClose={this.onClose}
          headerDisplayName={headerDisplayName}
          languagePack={languagePack}
          onRestart={this.onRestart}
          showHeader
          assistantName={assistantName}
        />
      </OverlayPanel>
    );
  }

  /**
   * Render the disclaimer panel.
   */
  renderDisclaimerPanel() {
    const { serviceManager, config } = this.props;

    const showDisclaimer = this.getShowDisclaimer();

    return config.public.disclaimer?.isOn ? (
      <OverlayPanel
        onOpenStart={() => this.onPanelOpenStart(false)}
        onCloseStart={this.onPanelCloseStart}
        onOpenEnd={this.onPanelOpenEnd}
        onCloseEnd={() => this.onPanelCloseEnd(false)}
        animationOnOpen={AnimationInType.FADE_IN}
        animationOnClose={AnimationOutType.FADE_OUT}
        shouldOpen={showDisclaimer}
        serviceManager={serviceManager}
        overlayPanelName={OverlayPanelName.DISCLAIMER}
      >
        <Disclaimer
          onAcceptDisclaimer={this.onAcceptDisclaimer}
          onClose={this.onClose}
          disclaimerHTML={config.public.disclaimer?.disclaimerHTML}
          disclaimerAcceptButtonRef={this.disclaimerRef}
        />
      </OverlayPanel>
    ) : null;
  }

  /**
   * Render the home screen panel.
   */
  renderHomeScreenPanel() {
    const { isHydrationAnimationComplete } = this.state;
    const showHomeScreen = this.getShowHomeScreen();

    return (
      <HomeScreenContainer
        onPanelOpenStart={() => this.onPanelOpenStart(false)}
        onPanelOpenEnd={this.onPanelOpenEnd}
        onPanelCloseStart={this.onPanelCloseStart}
        onPanelCloseEnd={() => this.onPanelCloseEnd(false)}
        onClose={this.onClose}
        onSendBotInput={(text: string) =>
          this.onSendInput(text, MessageSendSource.HOME_SCREEN_INPUT)
        }
        onSendButtonInput={this.onSendHomeButtonInput}
        onRestart={this.onRestart}
        showHomeScreen={showHomeScreen}
        isHydrationAnimationComplete={isHydrationAnimationComplete}
        homeScreenInputRef={this.homeScreenInputRef}
        onToggleHomeScreen={this.onToggleHomeScreen}
        requestFocus={this.requestFocus}
      />
    );
  }

  /**
   * Renders a panel containing an iframe to load the provided source. Only render the iframe panel if there's a source
   * to load. The reason being that the panel will receive an empty source and after 10 seconds will announce that the
   * source is not available.
   */
  renderIFramePanel() {
    const { serviceManager, iFramePanelState } = this.props;

    return (
      <OverlayPanel
        className="cds-aichat--overlay--covering"
        onOpenStart={() => this.onPanelOpenStart(true)}
        onCloseStart={this.onPanelCloseStart}
        onOpenEnd={this.onPanelOpenEnd}
        onCloseEnd={() => this.onPanelCloseEnd(true)}
        animationOnOpen={AnimationInType.SLIDE_IN_FROM_BOTTOM}
        animationOnClose={AnimationOutType.SLIDE_OUT_TO_BOTTOM}
        shouldOpen={iFramePanelState.isOpen}
        serviceManager={serviceManager}
        overlayPanelName={OverlayPanelName.IFRAME}
      >
        <IFramePanel
          useAITheme={this.props.config.derived.themeWithDefaults.aiEnabled}
          ref={this.iframePanelRef}
          onClickClose={this.onClose}
          onClickRestart={this.onRestart}
        />
      </OverlayPanel>
    );
  }

  renderViewSourcePanel() {
    const { serviceManager, viewSourcePanelState } = this.props;

    return (
      <OverlayPanel
        className="cds-aichat--overlay--covering"
        onOpenStart={() => this.onPanelOpenStart(true)}
        onCloseStart={this.onPanelCloseStart}
        onOpenEnd={this.onPanelOpenEnd}
        onCloseEnd={() => this.onPanelCloseEnd(true)}
        animationOnOpen={AnimationInType.SLIDE_IN_FROM_BOTTOM}
        animationOnClose={AnimationOutType.SLIDE_OUT_TO_BOTTOM}
        shouldOpen={viewSourcePanelState.isOpen}
        serviceManager={serviceManager}
        overlayPanelName={OverlayPanelName.CONVERSATIONAL_SEARCH_CITATION}
      >
        <ViewSourcePanel
          ref={this.viewSourcePanelRef}
          onClickClose={this.onClose}
          onClickRestart={this.onRestart}
        />
      </OverlayPanel>
    );
  }

  /**
   * Renders a custom panel that can host Deb content.
   */
  renderCustomPanel() {
    return (
      <CustomPanel
        useAITheme={this.props.config.derived.themeWithDefaults.aiEnabled}
        onClose={this.onClose}
        onClickRestart={this.onRestart}
        onPanelOpenStart={() => this.onPanelOpenStart(true)}
        onPanelOpenEnd={this.onPanelOpenEnd}
        onPanelCloseStart={this.onPanelCloseStart}
        onPanelCloseEnd={() => this.onPanelCloseEnd(true)}
      />
    );
  }

  /**
   * Renders a panel that is surfaced by an authored response type that supports opening a panel either through user
   * interaction or automatically.
   */
  renderResponsePanel() {
    if (!this.props.responsePanelState.localMessageItem) {
      return null;
    }

    const { isOpen, localMessageItem, isMessageForInput } =
      this.props.responsePanelState;
    const panelOptions = (localMessageItem?.item as ButtonItem).panel;
    const eventName = `"Show panel" opened`;
    const eventDescription = "Panel opened through panel response type";
    const overlayPanelName = OverlayPanelName.PANEL_RESPONSE;

    return (
      <BodyAndFooterPanelComponent
        eventName={eventName}
        eventDescription={eventDescription}
        overlayPanelName={overlayPanelName}
        testIdPrefix={overlayPanelName}
        isOpen={isOpen}
        isMessageForInput={isMessageForInput}
        localMessageItem={localMessageItem}
        title={panelOptions?.title}
        showAnimations={panelOptions?.show_animations}
        useAITheme={this.props.config.derived.themeWithDefaults.aiEnabled}
        requestFocus={this.requestFocus}
        onClose={this.onClose}
        onClickRestart={this.onRestart}
        onClickBack={() =>
          this.props.serviceManager.store.dispatch(
            actions.setResponsePanelIsOpen(false),
          )
        }
        onPanelOpenStart={() => this.onPanelOpenStart(true)}
        onPanelOpenEnd={this.onPanelOpenEnd}
        onPanelCloseStart={this.onPanelCloseStart}
        onPanelCloseEnd={() => {
          this.onPanelCloseEnd(true);
          this.props.serviceManager.store.dispatch(
            actions.setResponsePanelContent(null, false),
          );
        }}
        renderMessageComponent={(childProps) => (
          <MessageTypeComponent {...childProps} />
        )}
      />
    );
  }

  renderWidget() {
    const {
      serviceManager,
      useCustomHostElement,
      catastrophicErrorType,
      config,
      isHydrated,
      config: {
        derived: { themeWithDefaults: theme, layout, languagePack },
      },
      chatWidthBreakpoint,
    } = this.props;
    const { closing, open } = this.state;
    const locale = config.public.locale || "en";
    const localeClassName = `cds-aichat--locale-${locale}`;

    const shouldUseLayer =
      theme.derivedCarbonTheme === CarbonTheme.G10 ||
      theme.derivedCarbonTheme === CarbonTheme.G100;

    const showGlass =
      config.public.enableFocusTrap &&
      open &&
      !config.public.header?.hideMinimizeButton;
    const trapActive = Boolean(showGlass && isHydrated);
    const isWideWidth = chatWidthBreakpoint === ChatWidthBreakpoint.WIDE;

    // The empty div below is required because FocusTrap will attach a ref to it overwriting our ref which we have
    // on the next div below that.
    /* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
    return (
      <FocusTrap active={trapActive}>
        <Layer
          className="cds-aichat--widget__layer"
          level={shouldUseLayer ? 1 : 0}
        >
          <div className="cds-aichat--main-window" ref={this.mainWindowRef}>
            {showGlass && (
              <div className="cds-aichat--widget__focus-trap-glass" />
            )}
            <div
              id={`cds-aichat--widget${serviceManager.namespace.suffix}`}
              className={cx(`cds-aichat--widget ${localeClassName}`, {
                "cds-aichat--widget--rounded":
                  theme.corners === CornersType.ROUND,
                "cds-aichat--widget--default-element": !useCustomHostElement,
                "cds-aichat--widget--launched": !closing,
                "cds-aichat--widget--closing": closing,
                "cds-aichat--widget--closed": !open,
                "cds-aichat--widget--max-width":
                  isWideWidth && layout.hasContentMaxWidth,
                [WIDTH_BREAKPOINT_NARROW]:
                  chatWidthBreakpoint === ChatWidthBreakpoint.NARROW,
                [WIDTH_BREAKPOINT_STANDARD]:
                  chatWidthBreakpoint === ChatWidthBreakpoint.STANDARD,
                [WIDTH_BREAKPOINT_WIDE]: isWideWidth,
              })}
              ref={this.containerRef}
            >
              <VisuallyHidden>
                <h1>{languagePack.window_title}</h1>
              </VisuallyHidden>
              {catastrophicErrorType && this.renderCatastrophicPanel()}
              {!catastrophicErrorType && (
                <div
                  ref={this.animationContainerRef}
                  className="cds-aichat--widget__animation-container"
                  onScroll={() => {
                    // When Carbon AI Chat initially opens, it's possible for focusable elements inside a custom panel to
                    // cause the element to scroll during the opening animations. The listener to reset any
                    // scrolling that is happening.
                    if (this.animationContainerRef.current.scrollTop !== 0) {
                      this.animationContainerRef.current.scrollTop = 0;
                    }
                  }}
                >
                  {this.renderChat()}
                </div>
              )}
              <div
                className="cds-aichat--main-window-modal-host"
                ref={this.setModalPortalHostElement}
              />
            </div>
          </div>
        </Layer>
      </FocusTrap>
    );
  }

  render() {
    return (
      <ModalPortalRootProvider hostElement={this.state.modalPortalHostElement}>
        {this.renderWidget()}
      </ModalPortalRootProvider>
    );
  }
}

// Functional wrapper to supply AppState via hooks
const MainWindowStateInjector = React.forwardRef<
  MainWindow,
  MainWindowOwnProps
>((props, ref) => {
  const state = useSelector<AppState, AppState>((s) => s);
  return <MainWindow {...(props as MainWindowOwnProps)} {...state} ref={ref} />;
});

export default withServiceManager(MainWindowStateInjector);
