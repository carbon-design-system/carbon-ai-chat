/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Home16 from "@carbon/icons/es/home/16.js";
import { carbonIconToReact } from "../../utils/carbonIcon";
import React, {
  forwardRef,
  RefObject,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { useSelector } from "../../hooks/useSelector";
import { shallowEqual } from "../../store/appStore";

import { useLanguagePack } from "../../hooks/useLanguagePack";
import { useServiceManager } from "../../hooks/useServiceManager";
import { selectHumanAgentDisplayState } from "../../store/selectors";
import { AppState } from "../../../types/state/AppState";
import { HasRequestFocus } from "../../../types/utilities/HasRequestFocus";
import { WriteableElementName } from "../../utils/constants";
import WriteableElement from "../WriteableElement";
import { Header } from "./Header";

/**
 * This component renders the header that appears on the main bot view.
 */

interface AssistantHeaderProps {
  /**
   * This callback is called when the user clicks the close button.
   */
  onClose: () => void;

  /**
   * This callback is called when the user clicks the restart button.
   */
  onRestart?: () => void;

  /**
   * The callback that can be called to toggle between the home screen and the bot view.
   */
  onToggleHomeScreen: () => void;

  /**
   * The name of the bot to display.
   */
  headerDisplayName: string;

  /**
   * Indicates if the writeable element should be rendered.
   */
  includeWriteableElement: boolean;

  /**
   * Determines if the chat header items should be visible. If not enabled, the updateChatHeaderConfig method will
   * have no effect on the header. Meaning the config object will not be used to render chat header items or display
   * name.
   */
  enableChatHeaderConfig?: boolean;
}

function AssistantHeader(
  props: AssistantHeaderProps,
  ref: RefObject<HasRequestFocus | null>,
) {
  const {
    onClose,
    onRestart,
    onToggleHomeScreen,
    headerDisplayName,
    includeWriteableElement,
    enableChatHeaderConfig,
  } = props;
  const serviceManager = useServiceManager();
  const languagePack = useLanguagePack();
  const homeScreenIsOn = useSelector((state: AppState) => {
    const homescreen = state.config.public.homescreen;
    return homescreen?.isOn && !homescreen?.disableReturn;
  });
  const derivedPublicConfig = useSelector(
    (state: AppState) => state.config.derived,
  );
  const customMenuOptions = derivedPublicConfig.header.menuOptions;
  const memoizedCustomMenuOptions = useMemo(
    () => customMenuOptions || undefined,
    [customMenuOptions],
  );
  const { isConnectingOrConnected } = useSelector(
    selectHumanAgentDisplayState,
    shallowEqual,
  );
  const headerRef = useRef<HasRequestFocus>(undefined);
  const Home = carbonIconToReact(Home16);

  const showRestartButton = derivedPublicConfig.header?.showRestartButton;

  // We can't allow the user to return to the home screen if the user is connecting or connected to an agent.
  const allowHomeScreen = homeScreenIsOn && !isConnectingOrConnected;

  const overflowClicked = useCallback(
    (index: number) => {
      if (index === 0 && allowHomeScreen) {
        onToggleHomeScreen?.();
      } else {
        const { handler } =
          memoizedCustomMenuOptions[allowHomeScreen ? index - 1 : index];
        handler();
      }
    },
    [memoizedCustomMenuOptions, onToggleHomeScreen, allowHomeScreen],
  );

  const overflowItems = memoizedCustomMenuOptions?.map((option) => option.text);
  if (overflowItems && allowHomeScreen) {
    // Insert a "Home screen" option at the top.
    overflowItems.splice(0, 0, languagePack.homeScreen_overflowMenuHomeScreen);
  }

  // Reuse the imperative handles from the header.
  useImperativeHandle(ref, () => headerRef.current);

  return (
    <div className="cds-aichat--header__container">
      {derivedPublicConfig.header?.isOn && (
        <Header
          ref={headerRef}
          displayName={headerDisplayName}
          showBackButton={Boolean(allowHomeScreen && onToggleHomeScreen)}
          showRestartButton={showRestartButton}
          backContent={<Home slot="icon" />}
          labelBackButton={languagePack.homeScreen_returnToHome}
          onClickRestart={onRestart}
          onClickClose={onClose}
          onClickBack={onToggleHomeScreen}
          overflowItems={overflowItems}
          overflowClicked={overflowClicked}
          enableChatHeaderConfig={enableChatHeaderConfig}
        />
      )}
      {includeWriteableElement && (
        <WriteableElement
          slotName={WriteableElementName.HEADER_BOTTOM_ELEMENT}
          id={`headerBottomElement${serviceManager.namespace.suffix}`}
          className="cds-aichat--header__header-bottom-element"
        />
      )}
    </div>
  );
}

const AssistantHeaderExport = React.memo(forwardRef(AssistantHeader));
export { AssistantHeaderExport as AssistantHeader };
