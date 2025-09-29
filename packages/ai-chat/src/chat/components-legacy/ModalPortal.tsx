/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { Component } from "react";
import ReactDOM from "react-dom";

import { ModalPortalRootContext } from "../contexts/ModalPortalRootContext";

/**
 * This component acts as a portal that can be used to insert modal components that need to sit on top of the entire
 * chat widget and potentially overflow the bounds of the widget. The host element where the portal will be attached
 * should be provided via {@link ModalPortalRootContext}. This class does not make any assumption if the host
 * element is immediately available when this component is mounted. If the element is changed later, the component
 * can attach then.
 */

interface ModalPortalProps {
  /**
   * Children to be shown.
   */
  children: string | JSX.Element | JSX.Element[];
}

interface ModalPortalState {
  /**
   * The host element where this portal is attached. This value is set as soon as the element becomes available from
   * the context.
   */
  attachedToHost: Element;
}

// eslint-disable-next-line @typescript-eslint/ban-types
class ModalPortal extends Component<ModalPortalProps, ModalPortalState> {
  // Specify the context type and redefine the context property so it's got the right type.
  static contextType = ModalPortalRootContext;
  declare context: React.ContextType<typeof ModalPortalRootContext>;

  /**
   * Default state.
   */
  public readonly state: Readonly<ModalPortalState> = { attachedToHost: null };

  /**
   * The element that will contain this modal instance.
   */
  private modalElement = document.createElement("div");

  componentDidMount() {
    // Attach to the host if it's available right away.
    this.attachIfNeeded();
  }

  componentDidUpdate() {
    // Attach to the host later if it wasn't available when we mounted.
    this.attachIfNeeded();
  }

  componentWillUnmount() {
    if (this.state.attachedToHost) {
      this.state.attachedToHost.removeChild(this.modalElement);
      // this.attachedToHost = null;
    }
  }

  /**
   * This function will attach this component to the host element if needed and if the host element is available.
   */
  private attachIfNeeded() {
    const hostElement = this.context;
    if (hostElement && !this.state.attachedToHost) {
      // The value in the context is the host element. When we see it come in the first time, we'll attach to it and
      // store it in state to make sure we re-render when that happens.
      this.setState({ attachedToHost: hostElement });
      hostElement.appendChild(this.modalElement);
    }
  }

  render() {
    if (!this.state.attachedToHost) {
      // Don't render anything until after we've gotten attached to the host.
      return null;
    }

    return ReactDOM.createPortal(this.props.children, this.modalElement);
  }
}

export { ModalPortal };
