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
} from "react";
import { useSelector } from "../../hooks/useSelector";

import { AppState } from "../../../types/state/AppState";
import { HasRequestFocus } from "../../../types/utilities/HasRequestFocus";
import { Header } from "../header/Header";

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
  const showRestartButton = useSelector(
    (state: AppState) => state.config.derived.header?.showRestartButton,
  );
  const customMenuOptions = useSelector(
    (state: AppState) => state.config.derived.header?.menuOptions,
  );
  const memoizedCustomMenuOptions = useMemo(
    () => customMenuOptions || undefined,
    [customMenuOptions],
  );
  const headerRef = useRef<HasRequestFocus>();

  // Reuse the imperative handles from the header.
  useImperativeHandle(ref, () => headerRef.current);

  const overflowClicked = useCallback(
    (index: number) => {
      const { handler } = memoizedCustomMenuOptions[index];
      handler();
    },
    [memoizedCustomMenuOptions],
  );

  const overflowItems = memoizedCustomMenuOptions?.map(
    (option: any) => option.text,
  );

  return (
    <div className="cds-aichat--home-screen-header">
      <Header
        ref={headerRef}
        showRestartButton={showRestartButton}
        onClickRestart={onRestart}
        onClickClose={onClose}
        overflowClicked={overflowClicked}
        overflowItems={overflowItems}
      />
    </div>
  );
}

const HomeScreenHeaderExport = React.memo(forwardRef(HomeScreenHeader));
export { HomeScreenHeaderExport as HomeScreenHeader };
