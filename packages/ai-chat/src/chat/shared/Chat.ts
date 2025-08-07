/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import dayjs from "dayjs";
import LocalizedFormat from "dayjs/plugin/localizedFormat.js";
import isEqual from "lodash-es/isEqual.js";
import merge from "lodash-es/merge.js";

import { createChatInstance } from "./ChatInstanceImpl";
import { ChatInterface } from "./ChatInterface";
import { createServiceManager } from "./loadServices";
import { ServiceManager } from "./services/ServiceManager";
import actions from "./store/actions";
import { VIEW_STATE_ALL_CLOSED } from "./store/reducerUtils";
import { AdditionalChatParameters } from "../../types/component/AdditionalChatParameters";
import { AppConfig } from "../../types/state/AppConfig";
import { loadLanguagePack, loadLocale } from "./utils/languages";
import { consoleDebug, consoleError } from "./utils/miscUtils";
import { DEFAULT_PUBLIC_CONFIG } from "./chatEntryFunctions";
import { PublicConfig } from "../../types/config/PublicConfig";
import { ChatInstance } from "../../types/instance/ChatInstance";
import {
  MainWindowOpenReason,
  ViewChangeReason,
} from "../../types/events/eventBusTypes";
import { setIntl } from "./utils/intlUtils";
import createHumanAgentService from "./services/haa/HumanAgentServiceImpl";

// Dayjs is a date library similar to moment, but that allows you to compose how much functionality you need. Here we
// add the ability to add strings in the format of a given locale.
dayjs.extend(LocalizedFormat);

class Chat implements ChatInterface {
  private serviceManager: ServiceManager;
  private appConfig: AppConfig;

  /**
   * The host element into which to render the widget. This is provided in the original public config from the host
   * page.
   */
  private customHostElement?: HTMLElement;

  /**
   * An object with values important to Carbon AI Chat that are separate from the external configs.
   */
  private additionalChatParameters?: AdditionalChatParameters;

  /**
   * Create new Carbon AI Chat instance.
   *
   * @param publicConfigProvided The public config provided by the user.
   * @param customHostElement The host element into which to render the widget. This is provided in the original public
   * config from the host page.
   * @param additionalChatParametersProvided An object with values important to Carbon AI Chat that are separate from the
   * external configs
   */
  constructor(
    publicConfigProvided: PublicConfig,
    customHostElement?: HTMLElement,
    additionalChatParametersProvided?: AdditionalChatParameters
  ) {
    if (publicConfigProvided?.debug) {
      consoleDebug("Constructed chat widget", publicConfigProvided);
    }

    // Make a clone of the public config so we don't get messed up if someone modifies this object outside of our
    // control. Also add in any default values that might be missing.
    const publicConfig: PublicConfig = merge(
      {},
      DEFAULT_PUBLIC_CONFIG,
      publicConfigProvided
    );
    this.additionalChatParameters = additionalChatParametersProvided || {};

    // Note that because redux objects are immutable (which we ensured with the clone above), we can set the public
    // and publicOriginal values to the same object. If the public value is changed, a new object will be created.
    this.appConfig = {
      public: publicConfig,
    };

    this.customHostElement = customHostElement;
  }

  /**
   * Starts the chat widget. This will return a promise that resolves to an instance of the started widget that can
   * be used by the host page to interact with the widget.
   */
  async start(): Promise<ChatInstance> {
    try {
      const result = await this.startInternal();
      return result.instance;
    } catch (error) {
      consoleError("There was an error starting your chat", error);
      return null;
    }
  }

  /**
   * Starts the chat widget. This will return a promise that resolves to an instance of the started widget that can
   * be used by the host page to interact with the widget. This internal version of the function also provides
   * access to helper objects that were constructed at the same time as the chat instance.
   */
  async startInternal(): Promise<{
    instance: ChatInstance;
    serviceManager: ServiceManager;
  }> {
    this.serviceManager = await createServiceManager(
      this.appConfig,
      this.additionalChatParameters
    );

    // Asynchronously load all of the various dependencies that the Carbon AI Chat depends on.
    const [languagePack, localePack, render] = await Promise.all([
      loadLanguagePack(this.serviceManager.store.getState().languagePack),
      loadLocale(this.serviceManager.store.getState().locale),
      Promise.resolve(this.additionalChatParameters.render),
    ]);

    this.serviceManager.customHostElement = this.customHostElement;

    this.serviceManager.humanAgentService = createHumanAgentService(
      this.serviceManager
    );

    // Update Redux with new values for language, locale, and messages.
    setIntl(this.serviceManager, localePack.name, languagePack);

    // Tell dayjs to globally use the locale.
    dayjs.locale(localePack);

    // Here we render the application. If the tour or main window are supposed to be open then we will hydrate the
    // chat if sessionHistory is enabled, or fetch the welcome node if it's disabled.
    const reallyRenderAndReturnInstance = async () => {
      // Render the React application.
      await render({ serviceManager: this.serviceManager });

      const initialState = this.serviceManager.store.getState();
      const { wasLoadedFromBrowser } =
        initialState.persistedToBrowserStorage.launcherState;
      const { targetViewState } = initialState;
      const { openChatByDefault } = initialState.config.public;

      if (targetViewState.mainWindow) {
        // If the main window is supposed to be open (because openChatByDefault was set to true, or because the
        // viewState, in session storage, said that the main window was previously open) then fire the open:window
        // and view:change events, and try to change the view and hydrate the chat. The default event reason will be
        // session_history.
        let mainWindowOpenReason: MainWindowOpenReason =
          MainWindowOpenReason.SESSION_HISTORY;
        if (openChatByDefault && !wasLoadedFromBrowser) {
          // If openChatByDefault is true, and this is a new session, then the window:open reason will be
          // open_by_default and the view:change reason will be webChatDefault.
          mainWindowOpenReason = MainWindowOpenReason.OPEN_BY_DEFAULT;
        }
        await this.serviceManager.actions.changeView(targetViewState, {
          mainWindowOpenReason,
        });
      } else {
        // If a tour and/or the launcher are supposed to be open, or nothing is supposed to be open, then only fire
        // the view:change events and try to change the view.
        const viewChangeReason: ViewChangeReason =
          ViewChangeReason.WEB_CHAT_LOADED;

        // If a tour is supposed to be open then try to hydrate the chat.
        const tryHydrating = targetViewState.tour;

        // If nothing is supposed to be open then force the view:change events to fire. Since the default viewState
        // is all views closed, and the targetViewState is all views closed, changeView would see two equal
        // viewStates and not bother trying to fire the events unless forced to.
        const forceViewChange = isEqual(targetViewState, VIEW_STATE_ALL_CLOSED);

        await this.serviceManager.actions.changeView(
          targetViewState,
          { viewChangeReason },
          tryHydrating,
          forceViewChange
        );
      }

      // Lastly set the initialViewChangeComplete so that the launcher and other components can begin their
      // animations if they're visible.
      this.serviceManager.store.dispatch(
        actions.setInitialViewChangeComplete(true)
      );

      return this.serviceManager.instance;
    };

    // As part of the view change work a bug was exposed where someone calling openWindow, closeWindow, or
    // toggleOpen, immediately after calling instance.render() (and without waiting for render to finish), would
    // trigger viewChange to throw an error because it was in the middle of changing the view to set the view to the
    // targetViewState and couldn't accept another view change request at that time. The solution is to force the
    // instance.openWindow, instance.closeWindow, and instance.toggleOpen functions to wait for this renderPromise
    // to complete before allowing them to try and trigger a view change. This can be removed when the deprecated
    // window methods and events are removed.
    const renderAndReturnInstance = () => {
      const promise = reallyRenderAndReturnInstance();
      this.serviceManager.renderPromise = promise;
      return promise;
    };

    // Create the "started" instance of the widget.
    this.serviceManager.instance = createChatInstance({
      serviceManager: this.serviceManager,
      callRender: renderAndReturnInstance,
    });

    return {
      instance: this.serviceManager.instance,
      serviceManager: this.serviceManager,
    };
  }
}

export default Chat;
