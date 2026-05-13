/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import { AriaAnnouncerManager } from "@carbon/ai-chat-components/es/globals/utils/aria-announcer-manager.js";

import { AnnounceMessage } from "../../../types/state/AppState";
import HasIntl from "../../../types/utilities/HasIntl";
import { nodeToText } from "../../utils/domUtils";
import VisuallyHidden from "../util/VisuallyHidden";

/**
 * Holds the visually-hidden ARIA live regions used for screen-reader
 * announcements throughout the React app, and adapts the shared
 * `AriaAnnouncerManager` to React-specific inputs (intl messages, DOM nodes).
 *
 * Three regions are connected (vs. two in `chat-shell`) because in earlier
 * testing FF + JAWS occasionally re-read entire region contents on append;
 * rotating across three rather than two ensures there's always a fresh
 * region for the next announcement. The rotation, dual-clear, and 250 ms
 * NVDA debounce are all owned by the shared manager.
 */
class AriaAnnouncerComponent extends React.PureComponent<HasIntl> {
  private ref1 = React.createRef<HTMLDivElement>();
  private ref2 = React.createRef<HTMLDivElement>();
  private ref3 = React.createRef<HTMLDivElement>();

  private manager = new AriaAnnouncerManager();

  /**
   * Raw values queued from the current tick. Nodes stay as nodes here so
   * that `nodeToText` runs after the synchronous call stack drains —
   * legacy callers (e.g. `MessageComponent`) hand us a ref whose Lit
   * descendants populate via the event bus on the same tick.
   */
  private pendingValues: (Node | string)[] = [];

  componentDidMount(): void {
    const refs = [
      this.ref1.current,
      this.ref2.current,
      this.ref3.current,
    ].filter((el): el is HTMLDivElement => el !== null);
    this.manager.connect(refs);
  }

  componentWillUnmount(): void {
    this.manager.disconnect();
  }

  /**
   * Resolve the React-specific input shapes (intl message, DOM node) to a
   * string, then forward to the shared manager. Multiple calls in the same
   * tick are coalesced; nodes are converted in a microtask so synchronous
   * event-bus listeners have a chance to populate them first.
   */
  public announceValue(value: Node | AnnounceMessage | string) {
    if (!value) {
      return;
    }

    if (typeof value === "string" || hasNodeType(value)) {
      this.queueRawValue(value);
    } else if (value.messageID) {
      this.queueRawValue(
        this.props.intl.formatMessage(
          { id: value.messageID },
          value.messageValues,
        ),
      );
    } else {
      this.queueRawValue(value.messageText);
    }
  }

  private queueRawValue(value: Node | string) {
    const wasEmpty = this.pendingValues.length === 0;
    this.pendingValues.push(value);
    if (wasEmpty) {
      Promise.resolve().then(this.flushPendingValues);
    }
  }

  private flushPendingValues = () => {
    const queue = this.pendingValues;
    this.pendingValues = [];

    const parts: string[] = [];
    queue.forEach((entry) => {
      if (typeof entry === "string") {
        parts.push(entry);
      } else {
        nodeToText(entry, parts);
      }
    });

    const text = parts.join(" ");
    if (text) {
      this.manager.announce(text);
    }
  };

  render() {
    // Note: aria-atomic is intentionally omitted. With it, FF + JAWS read
    // some messages cleanly but Chrome stops announcing buttons inside the
    // region. Without it, FF + JAWS sometimes double-read parts but Chrome
    // handles buttons. The default (off) is the lesser evil here.
    return (
      <VisuallyHidden className="cds-aichat--aria-announcer">
        <div ref={this.ref1} aria-live="polite" />
        <div ref={this.ref2} aria-live="polite" />
        <div ref={this.ref3} aria-live="polite" />
      </VisuallyHidden>
    );
  }
}

function hasNodeType(value: any): value is Node {
  return value.nodeType !== undefined;
}

export { AriaAnnouncerComponent };
