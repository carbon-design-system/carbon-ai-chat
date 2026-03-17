/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import { AnnounceMessage } from "../../../types/state/AppState";
import HasIntl from "../../../types/utilities/HasIntl";
import { nodeToText } from "../../utils/domUtils";
import VisuallyHidden from "../util/VisuallyHidden";

/**
 * This component holds several aria live-regions that are used to make screen reader announcements by the application.
 * This component can announce both plain text as well as the content of complex HTML elements. HTML elements will be
 * converted to a raw text format before being announced.
 *
 * The component makes use of three live-region elements that are permanently attached to the DOM. It will rotate
 * between the usage of these three elements to announce changes. This accomplishes a few things. First, in my initial
 * work, I kept finding cases where the browser would re-read the entire live region when elements are added to it even
 * with aria-relevant="additions" and aria-atomic="false". Clearing the previous content was the only way to stop that
 * happening. However you can't simply add the content and then immediately clear it because sometimes the SR won't read
 * the content without some sort of delay before it's cleared (even waiting a tick isn't enough). In addition, multiple
 * elements will make sure the SR will read a new message even if it has the same content as a previous message, and
 * using three elements provides better reliability by ensuring there's always a fresh element available.
 */
class AriaAnnouncerComponent extends React.PureComponent<HasIntl> {
  /**
   * The first element into which the messages will be added.
   */
  private ref1 = React.createRef<HTMLDivElement>();

  /**
   * The second element into which the messages will be added.
   */
  private ref2 = React.createRef<HTMLDivElement>();

  /**
   * The third element into which the messages will be added.
   */
  private ref3 = React.createRef<HTMLDivElement>();

  /**
   * Indicates which of the three elements should next be used to announce a new message (0, 1, or 2).
   */
  private currentRefIndex = 0;

  /**
   * The set of values that are to be announced on the next tick. This will be null to indicate that a setTimeout
   * for previous values has not started yet.
   */
  private pendingValues: (Node | string)[];

  /**
   * This is the public function that will announce the given value or element.
   *
   * This function makes use of a setTimeout which will allow it to announce multiple values that all occurred in the
   * same tick of the VM. All of those messages will be appended to the same live region to be read and the previous set
   * of values that were read will be cleared from the opposite region. If an element is provided it is not converted to
   * text until the setTimeout runs which also allows a chance for custom elements to be populated by the event bus but
   * only if the custom elements are created synchronously.
   */
  public announceValue(value: Node | AnnounceMessage | string) {
    if (!value) {
      return;
    }

    if (!this.pendingValues) {
      this.pendingValues = [];
      // This delay of 250ms is here to work around a problem with NVDA. It seems that sometimes if an element gets
      // focus, that change can interrupt the announcement in a live region even when the live region is changed
      // after the focus change. Smaller numbers seem to be less reliable in working around this.
      setTimeout(this.doAnnouncements, 250);
    }

    if (typeof value === "string" || hasNodeType(value)) {
      this.pendingValues.push(value);
    } else if (value.messageID) {
      const formattedMessage = this.props.intl.formatMessage(
        { id: value.messageID },
        value.messageValues,
      );
      this.pendingValues.push(formattedMessage);
    } else {
      this.pendingValues.push(value.messageText);
    }
  }

  /**
   * Performs the actual announcements. A clone of the element is created that is the basis of what is announced. On
   * the clone, all the listeners will be removed and all the elements will be made non-tabbable so the user can't
   * actually interact with them.
   */
  private doAnnouncements = () => {
    const strings: string[] = [];

    // Turn all of the pending elements into strings.
    this.pendingValues.forEach((elementToAnnounce) => {
      if (typeof elementToAnnounce === "string") {
        strings.push(elementToAnnounce);
      } else {
        nodeToText(elementToAnnounce, strings);
      }
    });

    const refs = [this.ref1, this.ref2, this.ref3];
    const useElement = refs[this.currentRefIndex].current;

    if (useElement) {
      useElement.innerText = strings.join(" ");

      // Clear the other two elements
      refs.forEach((ref, index) => {
        if (index !== this.currentRefIndex && ref.current) {
          ref.current.innerHTML = "";
        }
      });
    }

    // Rotate to the next element (0 -> 1 -> 2 -> 0)
    this.currentRefIndex = (this.currentRefIndex + 1) % 3;
    this.pendingValues = null;
  };

  render() {
    // On FF+JAWS, it reads parts of the messages twice if you don't have aria-atomic="true". However, if you add this
    // attribute then Chrome will stop announcing buttons :-(.
    return (
      <VisuallyHidden className="cds-aichat--aria-announcer">
        <div ref={this.ref1} aria-live="polite" />
        <div ref={this.ref2} aria-live="polite" />
        <div ref={this.ref3} aria-live="polite" />
      </VisuallyHidden>
    );
  }
}

/**
 * Determines if the given value is some node type.
 */
function hasNodeType(value: any): value is Node {
  return value.nodeType !== undefined;
}

export { AriaAnnouncerComponent };
