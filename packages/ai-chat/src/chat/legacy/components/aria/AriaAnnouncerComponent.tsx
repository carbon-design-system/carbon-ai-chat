/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import { AnnounceMessage } from "../../../../types/state/AppState";
import HasIntl from "../../../../types/utilities/HasIntl";
import {
  isElement,
  isImageNode,
  isInputNode,
  isTextAreaNode,
  isTextNode,
} from "../../../utils/domUtils";
import VisuallyHidden from "../util/VisuallyHidden";
import { isBrowser } from "../../../utils/browserUtils";

// The set of types for an INPUT node that we want to announce the value of.
const ANNOUNCE_INPUT_TYPES = new Set([
  "button",
  "date",
  "datetime-local",
  "email",
  "file",
  "month",
  "number",
  "range",
  "reset",
  "search",
  "submit",
  "tel",
  "text",
  "time",
  "url",
  "week",
]);

const ANNOUNCE_NODE_EXCLUDE_ATTRIBUTE = "data-wac-exclude-node-read";

/**
 * This component holds several aria live-regions that are used to make screen reader announcements by the application.
 * This component can announce both plain text as well as the content of complex HTML elements. HTML elements will be
 * converted to a raw text format before being announced.
 *
 * The component makes use of two live-region elements that are permanently attached to the DOM. It will alternate
 * between the usage of these two elements to announce changes. This accomplishes a few things. First, in my initial
 * work, I kept finding cases where the browser would re-read the entire live region when elements are added to it even
 * with aria-relevant="additions" and aria-atomic="false". Clearing the previous content was the only way to stop that
 * happening. However you can't simply add the content and then immediately clear it because sometimes the SR won't read
 * the content without some sort of delay before it's cleared (even waiting a tick isn't enough). In addition, a second
 * element will make sure the SR will read a new message even if it has the same content as a previous message.
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
   * Indicates which of the two elements should next to be used to announce a new message.
   */
  private useRef1 = true;

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

    const useElement = this.useRef1 ? this.ref1.current : this.ref2.current;
    if (useElement) {
      useElement.innerText = strings.join(" ");

      // Clear the previous element and then swap the active one.
      const clearElement = this.useRef1 ? this.ref2.current : this.ref1.current;
      clearElement.innerHTML = "";
    }

    this.useRef1 = !this.useRef1;
    this.pendingValues = null;
  };

  render() {
    // On FF+JAWS, it reads parts of the messages twice if you don't have aria-atomic="true". However, if you add this
    // attribute then Chrome will stop announcing buttons :-(.
    return (
      <VisuallyHidden className="cds-aichat--aria-announcer">
        <div ref={this.ref1} aria-live="polite" />
        <div ref={this.ref2} aria-live="polite" />
      </VisuallyHidden>
    );
  }
}

/**
 * Converts the given node into text by extracting all of the text content from it and any children inside of it.
 * Any resulting pieces of text will be added to the given array.
 */
function nodeToText(node: Node, strings: string[]) {
  if (isElement(node)) {
    if (
      (!isBrowser || window.getComputedStyle(node).display !== "none") &&
      node.getAttribute("aria-hidden") !== "true" &&
      !node.hasAttribute(ANNOUNCE_NODE_EXCLUDE_ATTRIBUTE)
    ) {
      trimAndPush(node.getAttribute("aria-label"), strings);

      if (
        isInputNode(node) &&
        ANNOUNCE_INPUT_TYPES.has(node.type.toLowerCase())
      ) {
        // If the node has a value, announce that. Otherwise announce any placeholder text.
        if (node.value === "") {
          trimAndPush(node.placeholder, strings);
        } else {
          trimAndPush(node.value, strings);
        }
      } else if (isTextAreaNode(node)) {
        // For text areas, the value is built from children so we don't need to add the value to the strings here.
        // The children will get added below.
        if (node.value === "") {
          trimAndPush(node.placeholder, strings);
        }
      } else if (isImageNode(node)) {
        trimAndPush(node.alt, strings);
      }

      // Recursively go through all of the children. Most nodes will have children either in the shadowRoot.childNodes
      // or in childNodes. However web components that take advantage of slots will have both. With such a node
      // the shadowRoot comes first within the DOM and can contain children with aria-label's as well as <slots /> (which don't
      // have aria-label's). After the shadowRoot the childNodes are the next sibling. Some of those childNodes will
      // match to the corresponding slots in the shadowRoot and should have aria-label's. Because the shadowRoot is
      // often just a wrapper around the slots it makes sense to recursively go through those nodes first before
      // processing the slots farther down.
      if (node.shadowRoot) {
        node.shadowRoot.childNodes?.forEach((childNode) => {
          nodeToText(childNode, strings);
        });
      }
      if (node.childNodes) {
        node.childNodes.forEach((childNode) => {
          nodeToText(childNode, strings);
        });
      }
    }
  } else if (isTextNode(node)) {
    trimAndPush(node.data, strings);
  }
}

/**
 * Trims the given value and pushes it on to the given array assuming it has any content.
 */
function trimAndPush(value: string, strings: string[]) {
  if (value) {
    value = value.trim();
    if (value) {
      strings.push(value.replaceAll("\n", " "));
    }
  }
}

/**
 * Determines if the given value is some node type.
 */
function hasNodeType(value: any): value is Node {
  return value.nodeType !== undefined;
}

export { AriaAnnouncerComponent, nodeToText };
