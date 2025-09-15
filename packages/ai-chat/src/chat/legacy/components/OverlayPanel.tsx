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

import { HasServiceManager } from "../../hocs/withServiceManager";
import {
  AnimationInType,
  AnimationOutType,
} from "../../../types/utilities/Animation";
import { HasChildren } from "../../../types/utilities/HasChildren";
import { HasClassName } from "../../../types/utilities/HasClassName";
import { conditionalSetTimeout } from "../../utils/browserUtils";
import { HideComponent } from "./util/HideComponent";

/**
 * The possible overlay panels.
 *
 * @category Testing
 */
enum OverlayPanelName {
  /**
   * The main chat panel.
   */
  MAIN = "main",

  /**
   * Disclaimer panel.
   */
  DISCLAIMER = "disclaimer",

  /**
   * Homescreen Panel.
   */
  HOME_SCREEN = "home_screen",

  /**
   * Hydration/loading state panel.
   */
  HYDRATING = "hydrating",

  /**
   * Catastrophic error panel.
   */
  CATASTROPHIC = "catastrophic",

  /**
   * Iframe panel.
   */
  IFRAME = "iframe",

  /**
   * Conversational search panel.
   */
  CONVERSATIONAL_SEARCH_CITATION = "conversational_search_citation",

  /**
   * Custom panel.
   */
  CUSTOM = "custom",

  /**
   * Panel coming from a button response type.
   */
  SHOW_PANEL = "show_panel",

  /**
   * The unreleased panel response type.
   *
   * @internal
   */
  PANEL_RESPONSE = "panel_response",
}

const ANIMATION_DURATION_IN_MS = 240;

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
   * Unique name for overlay panel.
   */
  overlayPanelName: OverlayPanelName;

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
   * The duration of the open animation. This will default to {@link ANIMATION_DURATION_IN_MS} if not specified.
   */
  animationDurationOpen?: number;

  /**
   * The duration of the close animation. This will default to {@link ANIMATION_DURATION_IN_MS} if not specified.
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

  private openPanelTimeout: ReturnType<typeof setTimeout> = null;
  private closePanelTimeout: ReturnType<typeof setTimeout> = null;

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
    const { onOpenEnd, onOpenStart, animationOnOpen, animationDurationOpen } =
      this.props;

    onOpenStart?.();

    this.setState({
      isClosing: false,
      isOpening: true,
    });

    // Use a conditional setTimeout to avoid unnecessary flickering if there is no animation.
    const durationInMS =
      animationOnOpen === AnimationInType.NONE
        ? 0
        : animationDurationOpen || ANIMATION_DURATION_IN_MS;
    this.openPanelTimeout = conditionalSetTimeout(() => {
      this.setState({
        isClosing: false,
        isOpening: false,
      });

      onOpenEnd?.();
    }, durationInMS);
  };

  closePanel = () => {
    const {
      onCloseEnd,
      onCloseStart,
      animationOnClose,
      animationDurationClose,
    } = this.props;

    onCloseStart?.();

    this.setState({
      isClosing: true,
      isOpening: false,
    });

    // Use a conditional setTimeout to avoid unnecessary flickering if there is no animation.
    const durationInMS =
      animationOnClose === AnimationOutType.NONE
        ? 0
        : animationDurationClose || ANIMATION_DURATION_IN_MS;
    this.closePanelTimeout = conditionalSetTimeout(() => {
      this.setState({
        isClosing: false,
        isOpening: false,
      });

      onCloseEnd?.();
    }, durationInMS);
  };

  componentWillUnmount() {
    if (this.openPanelTimeout) {
      clearTimeout(this.openPanelTimeout);
    }

    if (this.closePanelTimeout) {
      clearTimeout(this.closePanelTimeout);
    }

    if (this.props.shouldOpen) {
      if (this.props.onCloseStart) {
        this.props.onCloseStart();
      }
      if (this.props.onCloseEnd) {
        this.props.onCloseEnd();
      }
    }
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
        className={cx(
          "cds-aichat--overlay-panel-container",
          `cds-aichat--overlay--${overlayPanelName}`,
          className,
          {
            "cds-aichat--overlay-panel-container--animating":
              isOpening || isClosing,
          },
        )}
      >
        <div
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

export { OverlayPanel, OverlayPanelName };
