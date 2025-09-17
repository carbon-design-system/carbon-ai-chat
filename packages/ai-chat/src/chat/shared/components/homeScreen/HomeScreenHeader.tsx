/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, {
  forwardRef,
  Ref,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";
import { useSelector } from "react-redux";

import { AppState } from "../../../../types/state/AppState";
import { HasRequestFocus } from "../../../../types/utilities/HasRequestFocus";
import { BrandColorKind } from "../../utils/constants";
import { Header } from "../header/Header";
import { OverlayPanelName } from "../OverlayPanel";
import { ThemeType } from "../../../../types/config/PublicConfig";

/**
 * This component renders the header that appears on the main bot view.
 */

interface HomeScreenHeaderProps {
  /**
   * This callback is called when the user clicks the close button.
   */
  onClose: () => void;

  /**
   * This callback is called when the user clicks the close-and-restart button and confirms the action.
   */
  onCloseAndRestart?: () => void;

  /**
   * This callback is called when the user clicks the restart button.
   */
  onRestart?: () => void;

  /**
   * The brand color type to use for the header. This will default to "primary".
   */
  brandColor?: BrandColorKind;
}

function HomeScreenHeader(
  props: HomeScreenHeaderProps,
  ref: Ref<HasRequestFocus>,
) {
  const { brandColor, onClose, onRestart, onCloseAndRestart } = props;
  const showRestartButton = useSelector(
    (state: AppState) => state.config.public.headerConfig?.showRestartButton,
  );
  const showBackButton = useSelector(
    (state: AppState) =>
      state.persistedToBrowserStorage.chatState.homeScreenState.showBackToBot,
  );
  const displayName = useSelector((state: AppState) => state.headerDisplayName);
  const customMenuOptions = useSelector(
    (state: AppState) => state.customMenuOptions,
  );
  const theme = useSelector((state: AppState) => state.theme.theme);
  const headerRef = useRef<HasRequestFocus>();

  // Reuse the imperative handles from the header.
  useImperativeHandle(ref, () => headerRef.current);

  // If there's no back button, it means this is the start of the conversation in which case there's no point in
  // showing the close-and-restart button.
  const hideCloseAndRestartButton = !showBackButton;

  const overflowClicked = useCallback(
    (index: number) => {
      const { handler } = customMenuOptions[index];
      handler();
    },
    [customMenuOptions],
  );

  const overflowItems = customMenuOptions?.map((option) => option.text);

  return (
    <div className="WACHomeScreenHeader">
      <Header
        ref={headerRef}
        displayName={displayName}
        showRestartButton={showRestartButton}
        hideCloseAndRestartButton={hideCloseAndRestartButton}
        onClickRestart={onRestart}
        onClickClose={onClose}
        onCloseAndRestart={onCloseAndRestart}
        overflowClicked={overflowClicked}
        overflowItems={overflowItems}
        useAITheme={theme === ThemeType.CARBON_AI}
        brandColor={brandColor}
        testIdPrefix={OverlayPanelName.HOME_SCREEN}
      />
    </div>
  );
}

const HomeScreenHeaderExport = React.memo(forwardRef(HomeScreenHeader));
export { HomeScreenHeaderExport as HomeScreenHeader };
