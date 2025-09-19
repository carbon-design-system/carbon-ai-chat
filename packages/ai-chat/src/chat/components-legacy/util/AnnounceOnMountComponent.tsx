/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This component creates an ARIA live-region around its children, but it does not render the children until this
 * component is mounted. A live-region does not make any announcements when the element is attached to the DOM.
 * Only changes made after it is attached are announced.
 */

import React, { PureComponent } from "react";

import {
  HasAriaAnnouncer,
  withAriaAnnouncer,
} from "../../hocs/withAriaAnnouncer";
import { HasChildren } from "../../../types/utilities/HasChildren";

interface AnnounceOnMountComponentProps extends HasAriaAnnouncer, HasChildren {
  /**
   * An optional additional message that can be announced the first time the component is mounted.
   */
  announceOnce?: string;
}

interface AnnounceOnMountComponentState {
  /**
   * Indicates if this component has been mounted.
   */
  isMounted: boolean;
}

class AnnounceOnMountComponent extends PureComponent<
  AnnounceOnMountComponentProps,
  AnnounceOnMountComponentState
> {
  /**
   * Default state.
   */
  public readonly state: Readonly<AnnounceOnMountComponentState> = {
    isMounted: false,
  };

  /**
   * Indicates if the "once" prop message has been announced.
   */
  private onceAnnounced = false;

  componentDidMount(): void {
    this.setState({ isMounted: true });

    if (!this.onceAnnounced) {
      if (this.props.announceOnce) {
        setTimeout(() => {
          this.props.ariaAnnouncer(this.props.announceOnce);
        });
      }
      this.onceAnnounced = true;
    }
  }

  render() {
    return (
      <div aria-live="polite">
        {this.state.isMounted && this.props.children}
      </div>
    );
  }
}

const AnnounceOnMountComponentExport = withAriaAnnouncer(
  AnnounceOnMountComponent,
);
export { AnnounceOnMountComponentExport as AnnounceOnMountComponent };
