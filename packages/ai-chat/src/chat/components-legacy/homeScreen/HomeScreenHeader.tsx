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
  useMemo,
  useRef,
  useContext,
} from "react";
import { useSelector } from "../../hooks/useSelector";

import { AppState } from "../../../types/state/AppState";
import { HasRequestFocus } from "../../../types/utilities/HasRequestFocus";
import { Header } from "../header/Header";
import { useLanguagePack } from "../../hooks/useLanguagePack";
import { useServiceManager } from "../../hooks/useServiceManager";
import WriteableElement from "../WriteableElement";
import { WriteableElementName } from "../../utils/constants";
import { HideComponentContext } from "../../contexts/HideComponentContext";
import { MinimizeButtonIconType } from "../../../types/config/PublicConfig";

/**
 * This component renders the header that appears on the main bot view.
 */

interface HomeScreenHeaderProps {
  /**
   * This callback is called when the user clicks the close button.
   */
  onClose: () => void;

  /**
   * This callback is called when the user clicks the restart button.
   */
  onRestart?: () => void;
}

function HomeScreenHeader(
  props: HomeScreenHeaderProps,
  ref: Ref<HasRequestFocus>,
) {
  const { onClose, onRestart } = props;
  const languagePack = useLanguagePack();
  const serviceManager = useServiceManager();
  const isHidden = useContext(HideComponentContext);
  const showRestartButton = useSelector(
    (state: AppState) => state.config.derived.header?.showRestartButton,
  );
  const customMenuOptions = useSelector(
    (state: AppState) => state.config.derived.header?.menuOptions,
  );
  const headerConfig = useSelector(
    (state: AppState) => state.config.derived.header,
  );
  const isRestarting = useSelector((state: AppState) => state.isRestarting);
  const memoizedCustomMenuOptions = useMemo(
    () => customMenuOptions || undefined,
    [customMenuOptions],
  );
  const headerRef = useRef<HasRequestFocus>(undefined);

  // Reuse the imperative handles from the header.
  useImperativeHandle(ref, () => headerRef.current);

  const overflowClicked = useCallback(
    (index: number) => {
      const handler = memoizedCustomMenuOptions?.[index]?.handler;
      handler?.();
    },
    [memoizedCustomMenuOptions],
  );

  const overflowItems = memoizedCustomMenuOptions?.map(
    (option: any) => option.text,
  );

  const aiSlugAfterDescriptionElement = !isHidden ? (
    <WriteableElement
      slotName={WriteableElementName.AI_TOOLTIP_AFTER_DESCRIPTION_ELEMENT}
      id={`aiTooltipAfterDescription${serviceManager.namespace.suffix}`}
    />
  ) : null;

  const showAiLabel = headerConfig?.showAiLabel !== false;
  const minimizeButtonIconType =
    headerConfig?.minimizeButtonIconType ?? MinimizeButtonIconType.MINIMIZE;
  const hideCloseButton = headerConfig?.hideMinimizeButton ?? false;
  const headerTitle = headerConfig?.title ?? undefined;
  const displayName = headerConfig?.name ?? undefined;

  return (
    <div className="cds-aichat--home-screen-header">
      <Header
        ref={headerRef}
        title={headerTitle}
        displayName={displayName}
        showRestartButton={showRestartButton}
        onClickRestart={onRestart}
        onClickClose={onClose}
        overflowClicked={overflowClicked}
        overflowItems={overflowItems}
        showAiLabel={showAiLabel}
        hideCloseButton={hideCloseButton}
        closeButtonLabel={languagePack.launcher_isOpen}
        overflowMenuTooltip={languagePack.header_overflowMenu_options}
        overflowMenuAriaLabel={languagePack.components_overflow_ariaLabel}
        restartButtonLabel={languagePack.buttons_restart}
        aiSlugLabel={languagePack.ai_slug_label}
        aiSlugTitle={languagePack.ai_slug_title}
        aiSlugDescription={languagePack.ai_slug_description}
        aiSlugAfterDescriptionElement={aiSlugAfterDescriptionElement}
        minimizeButtonIconType={minimizeButtonIconType}
        isRestarting={isRestarting}
      />
    </div>
  );
}

const HomeScreenHeaderExport = React.memo(forwardRef(HomeScreenHeader));
export { HomeScreenHeaderExport as HomeScreenHeader };
