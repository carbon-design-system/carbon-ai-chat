/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The set of possible animations for OverlayPanel animation into view.
 */
enum AnimationInType {
  /**
   * The panel does not animate.
   */
  NONE = "none",

  /**
   * The panel fades in from 0 opacity.
   */
  FADE_IN = "fadeIn",

  /**
   * The panel slides in from the left over previous content.
   */
  SLIDE_IN_FROM_LEFT = "slideInFromLeft",

  /**
   * The panel slides in from the right over previous content.
   */
  SLIDE_IN_FROM_RIGHT = "slideInFromRight",

  /**
   * The panel slides in from the bottom over the previous context.
   */
  SLIDE_IN_FROM_BOTTOM = "slideInFromBottom",

  /**
   * The panel slides in from the bottom over the previous context fast for branding.
   */
  BRANDING_SLIDE_IN_FROM_BOTTOM = "brandingSlideInFromBottom",

  /**
   * The custom animation for the home screen.
   */
  // HOME_SCREEN = 'homeScreen',
}

/**
 * The set of possible animations for OverlayPanel animation out of view.
 */
enum AnimationOutType {
  /**
   * The panel does not animate.
   */
  NONE = "none",

  /**
   * The panel fades to 0 opacity.
   */
  FADE_OUT = "fadeOut",

  /**
   * The panel slides out to left.
   */
  SLIDE_OUT_TO_LEFT = "slideOutToLeft",

  /**
   * The panel slides out to right.
   */
  SLIDE_OUT_TO_RIGHT = "slideOutToRight",

  /**
   * The panel slides out to top.
   */
  SLIDE_OUT_TO_TOP = "slideOutToTop",

  /**
   * The panel slides out to bottom.
   */
  SLIDE_OUT_TO_BOTTOM = "slideOutToBottom",

  /**
   * The custom animation for the home screen.
   */
  // HOME_SCREEN = 'homeScreen',
}

export { AnimationInType, AnimationOutType };
