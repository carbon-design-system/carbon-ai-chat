/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Options to configure the animation to play for an element after the given amount of timeouts.
 */
interface AnimationTimeoutOptions {
  /**
   * The index to start on for the recurring animation flow.
   */
  startingIndex?: number;

  /**
   * The callback function to fire before playing the provided animation for all timeouts.
   */
  beforeAll?: () => void;

  /**
   * The callback function to fire after playing the provided animation for all timeouts. If the animation is canceled,
   * this function will never be called.
   */
  afterAll?: () => void;

  /**
   * The callback function to fire before playing the provided animation for an individual timeout value. If the
   * animation is canceled, this function will never be called.
   */
  beforeEach?: () => void;

  /**
   * The callback function to fire after playing the provided animation for an individual timeout value. If the
   * animation is canceled, this function will never be called.
   */
  afterEach?: () => void;
}

/**
 * Triggers an animation event by temporarily adding the given classname to the given element. When the animation is
 * finished, the classname will be removed.
 *
 * The end of the animation can be determined a number of ways. If no additional arguments are specified, an
 * animation listener is added to the event and as soon as the first animation is finished, that counts as the end
 * of animations. You can also specify the name of an animation that will trigger the end of the animation. This can
 * be useful if you have multiple animations that run in sequence. Or lastly, you can simply specify a time duration.
 *
 * Keep in mind that the animation events bubble so if there are animations running on child elements, those will
 * trigger the events on this element.
 *
 * @param element This element to trigger the animation on.
 * @param className The name of the class to add and later remove from the element.
 * @param endAnimationNameOrDelay The name of an animation to indicate when the animation is finished or a number
 * indicating the duration in milliseconds to wait before ending the animation.
 * @param endAnimationCallback An optional callback that can be called when the animation is finished.
 */
function animateWithClass(
  element: HTMLElement,
  className: string,
  endAnimationNameOrDelay?: string | number,
  endAnimationCallback?: () => void,
) {
  if (element) {
    element.classList.add(className);

    if (typeof endAnimationNameOrDelay === "number") {
      setTimeout(() => {
        element.classList.remove(className);
        if (endAnimationCallback) {
          endAnimationCallback();
        }
      }, endAnimationNameOrDelay);
    } else {
      const listener = (event: AnimationEvent) => {
        if (
          !endAnimationNameOrDelay ||
          event.animationName === endAnimationNameOrDelay
        ) {
          element.removeEventListener("animationend", listener);
          element.removeEventListener("animationcancel", listener);
          element.classList.remove(className);

          if (endAnimationCallback) {
            endAnimationCallback();
          }
        }
      };

      element.addEventListener("animationend", listener);
      element.addEventListener("animationcancel", listener);
    }
  }
}

/**
 * Uses the provided element to play the given animation after each amount of time in the given timeouts array.
 *
 * @param element The element to apply the provided animation class to.
 * @param animation The animation class to play after the provided number of timeouts.
 * @param timeouts An array of timeouts that determines how long to wait before playing the animation. The first
 * timeout will be set immediately and a listener will wait for the animation to end before moving to the next timeout.
 * @param options Options with helper functions that fire throughout the lifecycle of the recurring animations.
 *
 * @returns endAnimation A function that will stop playing the provided animation when called.
 */
function setAnimationTimeouts(
  element: Element,
  animation: string,
  timeouts: number[],
  options: AnimationTimeoutOptions,
) {
  const { startingIndex, beforeAll, afterAll, beforeEach, afterEach } = options;
  // The index of the current timeout value to start off on in the array.
  let index = startingIndex || 0;
  // Determines if the animation should be prevented from playing.
  let terminate = false;
  // The ID of the setTimeout function.
  let timeoutID: ReturnType<typeof setTimeout> = null;

  /**
   * This will recursively play the provided animation class on the provided element after the amount of time specified
   * in the timeouts array.
   */
  function playAnimation() {
    // Call beforeAll immediately after this function is called.
    if (beforeAll && index === 0) {
      beforeAll();
    }

    // If the index equals the total number of values in the array, we are outside the scope of the array and have
    // completed the animations.
    const isComplete = index === timeouts.length;

    if (!isComplete && !terminate) {
      // Capture the timeout ID so we can clear it when needed.
      timeoutID = setTimeout(setAnimationListener, timeouts[index]);
    } else if (isComplete && afterAll) {
      afterAll();
    }
  }

  /**
   * Handles replaying the animation on the element using the next timeout in the array and resetting the element
   * to it's original state to prepare for the next animation.
   */
  function replayAnimation() {
    if (afterEach) {
      afterEach();
    }
    // Move onto the next timeout in the array.
    index++;
    // Remove this event listener so that it doesn't get fired again.
    element.removeEventListener("animationend", replayAnimation);
    // Remove the animation class since it has ended.
    element.classList.remove(animation);
    // Attempt to replay the animation.
    playAnimation();
  }

  /**
   * Handles playing and replaying the animation on the provided element.
   */
  function setAnimationListener() {
    if (beforeEach) {
      beforeEach();
    }
    // Begin the process to play the animation.
    element.addEventListener("animationend", replayAnimation);
    element.classList.add(animation);
  }

  playAnimation();

  /**
   * The callback function that will stop the recurring animation.
   */
  return () => {
    // Prevent the animation from playing/replaying.
    terminate = true;
    clearTimeout(timeoutID);
    // Remove the animation class in case it's still applied and the event listener.
    element.classList.remove(animation);
    element.removeEventListener("animationend", replayAnimation);
  };
}

export { animateWithClass, setAnimationTimeouts };
