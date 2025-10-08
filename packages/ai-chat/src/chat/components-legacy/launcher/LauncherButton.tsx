/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import CDSButton from "@carbon/web-components/es/components/button/button.js";
import cx from "classnames";
import React, {
  forwardRef,
  MutableRefObject,
  ReactNode,
  Ref,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";
import { IntlShape } from "react-intl";

import Button, {
  BUTTON_KIND,
  BUTTON_TYPE,
} from "../../components/carbon/Button";
import { doFocusRef } from "../../utils/domUtils";
import { HasRequestFocus } from "../../../types/utilities/HasRequestFocus";

interface LauncherButtonProps {
  onToggleOpen: () => void;
  closedLabel: string;
  openLabel: string;
  intl: IntlShape;
  unreadHumanAgentCount: number;
  showUnreadIndicator: boolean;
  launcherHidden: boolean;
  tabIndex?: number;
  dataTestId?: string;
  className?: string;
  containerClassName?: string;
  buttonRef?: Ref<CDSButton>;
  containerRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}

interface LauncherButtonFunctions extends HasRequestFocus {
  buttonElement: () => CDSButton | undefined;
  containerElement: () => HTMLDivElement | undefined;
}

type LauncherHandle = LauncherButtonFunctions & {
  launcherContainerElement?: () => HTMLDivElement | undefined;
};

function assignRef<T>(ref: Ref<T> | undefined, element: T | null) {
  if (!ref) {
    return;
  }

  if (typeof ref === "function") {
    ref(element);
  } else {
    (ref as MutableRefObject<T | null>).current = element;
  }
}

function LauncherButton(
  props: LauncherButtonProps,
  ref: Ref<LauncherButtonFunctions>,
) {
  const {
    onToggleOpen,
    closedLabel,
    openLabel,
    intl,
    unreadHumanAgentCount,
    showUnreadIndicator,
    launcherHidden,
    tabIndex,
    containerClassName,
    dataTestId,
    className,
    buttonRef,
    containerRef,
    children,
  } = props;

  const internalButtonRef = useRef<CDSButton>(undefined);
  const internalContainerRef = useRef<HTMLDivElement>(undefined);

  const setButtonRef = useCallback(
    (element: CDSButton | null) => {
      internalButtonRef.current = element ?? undefined;
      assignRef(buttonRef, element);
    },
    [buttonRef],
  );

  const setContainerRef = useCallback(
    (element: HTMLDivElement | null) => {
      internalContainerRef.current = element ?? undefined;
      assignRef(containerRef, element);
    },
    [containerRef],
  );

  useImperativeHandle(ref, () => ({
    requestFocus: () => {
      doFocusRef(internalButtonRef);
    },
    buttonElement: () => internalButtonRef.current,
    containerElement: () => internalContainerRef.current,
  }));

  let ariaLabel = launcherHidden ? openLabel : closedLabel;

  if (unreadHumanAgentCount !== 0) {
    ariaLabel += `. ${intl.formatMessage(
      { id: "icon_ariaUnreadMessages" },
      { count: unreadHumanAgentCount },
    )}`;
  }

  return (
    <div
      className={cx(
        "cds-aichat--launcher__button-container",
        "cds-aichat--launcher__button-container--round",
        containerClassName,
        {
          "cds-aichat--launcher__button-container--hidden": launcherHidden,
        },
      )}
      ref={setContainerRef}
    >
      <Button
        aria-label={ariaLabel}
        className={cx("cds-aichat--launcher__button", className)}
        data-testid={dataTestId}
        kind={BUTTON_KIND.PRIMARY}
        onClick={onToggleOpen}
        ref={setButtonRef}
        tabIndex={tabIndex}
        type={BUTTON_TYPE.BUTTON}
      >
        {children}

        {(unreadHumanAgentCount !== 0 || showUnreadIndicator) && (
          <div className="cds-aichat--count-indicator">
            {unreadHumanAgentCount !== 0 ? unreadHumanAgentCount : ""}
          </div>
        )}
      </Button>
    </div>
  );
}

const LauncherButtonExport = forwardRef(LauncherButton);
export type { LauncherButtonFunctions, LauncherHandle };
export { LauncherButtonExport as LauncherButton };
