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
  FADE_IN = "fade-in",

  /**
   * The panel slides in from the left over previous content.
   */
  SLIDE_IN_FROM_LEFT = "slide-in-from-left",

  /**
   * The panel slides in from the right over previous content.
   */
  SLIDE_IN_FROM_RIGHT = "slide-in-from-right",

  /**
   * The panel slides in from the bottom over the previous context.
   */
  SLIDE_IN_FROM_BOTTOM = "slide-in-from-bottom",

  /**
   * The panel slides in from the bottom over the previous context fast for branding.
   */
  BRANDING_SLIDE_IN_FROM_BOTTOM = "branding-slide-in-from-bottom",

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
  FADE_OUT = "fade-out",

  /**
   * The panel slides out to left.
   */
  SLIDE_OUT_TO_LEFT = "slide-out-to-left",

  /**
   * The panel slides out to right.
   */
  SLIDE_OUT_TO_RIGHT = "slide-out-to-right",

  /**
   * The panel slides out to top.
   */
  SLIDE_OUT_TO_TOP = "slide-out-to-top",

  /**
   * The panel slides out to bottom.
   */
  SLIDE_OUT_TO_BOTTOM = "slide-out-to-bottom",

  /**
   * The custom animation for the home screen.
   */
  // HOME_SCREEN = 'homeScreen',
}

export { AnimationInType, AnimationOutType };
