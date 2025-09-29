/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * A generic panel that can fade in, fade out, slide in, slide out, etc. with children inside it.
 */

import cx from "classnames";
import React, { PureComponent } from "react";

import { HasServiceManager } from "../hocs/withServiceManager";
import {
  AnimationInType,
  AnimationOutType,
} from "../../types/utilities/Animation";
import { HasChildren } from "../../types/utilities/HasChildren";
import { HasClassName } from "../../types/utilities/HasClassName";
import { isBrowser } from "../utils/browserUtils";
import { HideComponent } from "./util/HideComponent";
import { PageObjectId } from "../utils/PageObjectId";

const ANIMATION_START_DETECTION_DELAY_MS = 120;

interface OverlayPanelProps
  extends HasServiceManager,
    HasChildren,
    HasClassName {
  /**
   * Callback that is called after the overlay panel has opened.
   * There may be a delay before this is called to allow the panel to animate.
   */
  onOpenEnd?: () => void;

  /**
   * Callback that is called after the overlay panel has closed.
   * There is a delay before this is called to allow the slide out animation to run.
   */
  onCloseEnd?: () => void;

  /**
   * Callback that is called when the panel is going to start to open.
   */
  onOpenStart?: () => void;

  /**
   * Callback that is called when the panel is going to start to close.
   */
  onCloseStart?: () => void;

  /**
   * Unique name for overlay panel - should use a PageObjectId value for a panel.
   */
  overlayPanelName: PageObjectId;

  /**
   * How to animate in (in LTR languages, any directions here will be automatically flipped in a RTL language)
   */
  animationOnOpen: AnimationInType;

  /**
   * How to animate out (in LTR languages, any directions here will be automatically flipped in a RTL language)
   */
  animationOnClose: AnimationOutType;

  /**
   * If the panel should be open
   */
  shouldOpen: boolean;

  /**
   * If the panel should be hidden. This is so that we can hide the overlay while it's meant to be open and make it
   * visible again without firing the animation when it comes in again.
   */
  shouldHide?: boolean;

  /**
   * Optional override used to indicate the open animation duration; set to 0 to skip waiting for animation events.
   */
  animationDurationOpen?: number;

  /**
   * Optional override used to indicate the close animation duration; set to 0 to skip waiting for animation events.
   */
  animationDurationClose?: number;
}

interface OverlayPanelState {
  /**
   * Indicates that the overlay is opening.
   */
  isOpening: boolean;

  /**
   * Indicates that the overlay is closing.
   */
  isClosing: boolean;
}

class OverlayPanel extends PureComponent<OverlayPanelProps, OverlayPanelState> {
  public readonly state: Readonly<OverlayPanelState> = {
    isClosing: false,
    isOpening: false,
  };

  private pendingAnimation: "opening" | "closing" | null = null;
  private animationStarted = false;
  private animationFallbackId: number | null = null;

  componentDidMount() {
    const { shouldOpen } = this.props;
    // If the panel is open by default, we should open it.
    if (shouldOpen) {
      this.openPanel();
    }
  }

  componentDidUpdate(prevProps: Readonly<OverlayPanelProps>): void {
    const { shouldOpen } = this.props;
    // If the value of shouldOpen changes we kick off the animations to open/close the panel.
    if (shouldOpen !== prevProps.shouldOpen) {
      if (shouldOpen) {
        this.openPanel();
      } else {
        this.closePanel();
      }
    }
  }

  openPanel = () => {
    const { onOpenStart, animationOnOpen, animationDurationOpen } = this.props;

    onOpenStart?.();

    this.clearAnimationFallback();
    this.pendingAnimation = "opening";
    this.animationStarted = false;

    this.setState(
      {
        isClosing: false,
        isOpening: true,
      },
      () => {
        if (
          !this.shouldWaitForAnimation(animationOnOpen, animationDurationOpen)
        ) {
          this.completeOpen();
          return;
        }

        this.scheduleAnimationFallback();
      },
    );
  };

  closePanel = () => {
    const { onCloseStart, animationOnClose, animationDurationClose } =
      this.props;

    onCloseStart?.();

    this.clearAnimationFallback();
    this.pendingAnimation = "closing";
    this.animationStarted = false;

    this.setState(
      {
        isClosing: true,
        isOpening: false,
      },
      () => {
        if (
          !this.shouldWaitForAnimation(animationOnClose, animationDurationClose)
        ) {
          this.completeClose();
          return;
        }

        this.scheduleAnimationFallback();
      },
    );
  };

  componentWillUnmount() {
    this.clearAnimationFallback();
    this.pendingAnimation = null;
    this.animationStarted = false;

    if (this.props.shouldOpen) {
      if (this.props.onCloseStart) {
        this.props.onCloseStart();
      }
      if (this.props.onCloseEnd) {
        this.props.onCloseEnd();
      }
    }
  }

  private handleAnimationStart = (
    event: React.AnimationEvent<HTMLDivElement>,
  ) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    this.animationStarted = true;
  };

  private handleAnimationLifecycleEnd = (
    event: React.AnimationEvent<HTMLDivElement>,
  ) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (this.pendingAnimation === "opening" && this.state.isOpening) {
      this.completeOpen();
      return;
    }

    if (this.pendingAnimation === "closing" && this.state.isClosing) {
      this.completeClose();
    }
  };

  private shouldWaitForAnimation(
    animation: AnimationInType | AnimationOutType,
    durationOverride?: number,
  ): boolean {
    if (
      animation === AnimationInType.NONE ||
      animation === AnimationOutType.NONE ||
      durationOverride === 0
    ) {
      return false;
    }

    if (
      isBrowser &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return false;
    }

    return true;
  }

  private scheduleAnimationFallback() {
    if (!isBrowser) {
      return;
    }

    this.clearAnimationFallback();

    this.animationFallbackId = window.setTimeout(() => {
      if (this.animationStarted) {
        return;
      }

      if (this.pendingAnimation === "opening") {
        this.completeOpen();
        return;
      }

      if (this.pendingAnimation === "closing") {
        this.completeClose();
      }
    }, ANIMATION_START_DETECTION_DELAY_MS);
  }

  private clearAnimationFallback() {
    if (this.animationFallbackId !== null && isBrowser) {
      window.clearTimeout(this.animationFallbackId);
    }

    this.animationFallbackId = null;
  }

  private completeOpen() {
    this.clearAnimationFallback();

    if (this.pendingAnimation === "opening") {
      this.pendingAnimation = null;
    }

    if (!this.state.isOpening) {
      return;
    }

    this.animationStarted = false;

    this.setState(
      {
        isOpening: false,
        isClosing: false,
      },
      () => {
        this.props.onOpenEnd?.();
      },
    );
  }

  private completeClose() {
    this.clearAnimationFallback();

    if (this.pendingAnimation === "closing") {
      this.pendingAnimation = null;
    }

    if (!this.state.isClosing) {
      return;
    }

    this.animationStarted = false;

    this.setState(
      {
        isClosing: false,
        isOpening: false,
      },
      () => {
        this.props.onCloseEnd?.();
      },
    );
  }

  render() {
    const {
      children,
      className,
      shouldOpen,
      animationOnClose,
      animationOnOpen,
      overlayPanelName,
    } = this.props;
    const { isClosing, isOpening } = this.state;

    return (
      <HideComponent
        hidden={!isClosing && !shouldOpen}
        className={cx("cds-aichat--overlay-panel-container", className, {
          "cds-aichat--overlay-panel-container--animating":
            isOpening || isClosing,
        })}
      >
        <div
          onAnimationStart={this.handleAnimationStart}
          onAnimationEnd={this.handleAnimationLifecycleEnd}
          data-testid={overlayPanelName}
          className={cx(
            "cds-aichat--overlay-panel",
            `cds-aichat--overlay-panel--${overlayPanelName}`,
            {
              [`cds-aichat--overlay-panel--closing--${animationOnClose}`]:
                isClosing,
              "cds-aichat--overlay-panel--closed": !isClosing && !shouldOpen,
              [`cds-aichat--overlay-panel--opening--${animationOnOpen}`]:
                isOpening,
              "cds-aichat--overlay-panel--open": !isOpening && shouldOpen,
            },
          )}
        >
          {children}
        </div>
      </HideComponent>
    );
  }
}

export { OverlayPanel };
