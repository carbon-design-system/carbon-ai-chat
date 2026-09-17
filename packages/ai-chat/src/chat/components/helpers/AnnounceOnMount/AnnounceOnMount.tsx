/*
 *  Copyright IBM Corp. 2025, 2026
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

import React, { PureComponent } from 'react';

import {
  HasAriaAnnouncer,
  withAriaAnnouncer,
} from '../../../hocs/withAriaAnnouncer';
import { HasChildren } from '../../../../types/utilities/HasChildren';

interface AnnounceOnMountProps extends HasAriaAnnouncer, HasChildren {
  /**
   * An optional additional message that can be announced the first time the component is mounted.
   */
  announceOnce?: string;

  /**
   * When false, announces nothing and drops the live region, so a caller can keep
   * this component mounted while something else owns the announcement.
   */
  live?: boolean;
}

interface AnnounceOnMountState {
  /**
   * Indicates if this component has been mounted.
   */
  isMounted: boolean;
}

class AnnounceOnMount extends PureComponent<
  AnnounceOnMountProps,
  AnnounceOnMountState
> {
  /**
   * Default state.
   */
  public readonly state: Readonly<AnnounceOnMountState> = {
    isMounted: false,
  };

  /**
   * Indicates if the "once" prop message has been announced.
   */
  private onceAnnounced = false;

  componentDidMount(): void {
    this.setState({ isMounted: true });
    this.maybeAnnounce();
  }

  // A wrapper that mounted silent still owes its message once it goes live.
  componentDidUpdate(): void {
    this.maybeAnnounce();
  }

  private maybeAnnounce(): void {
    const { announceOnce, live, ariaAnnouncer } = this.props;

    if (this.onceAnnounced || !announceOnce || live === false) {
      return;
    }

    this.onceAnnounced = true;
    setTimeout(() => {
      ariaAnnouncer(announceOnce);
    });
  }

  render() {
    return (
      <div aria-live={this.props.live === false ? 'off' : 'polite'}>
        {this.state.isMounted && this.props.children}
      </div>
    );
  }
}

const AnnounceOnMountExport = withAriaAnnouncer(AnnounceOnMount);
export { AnnounceOnMountExport as AnnounceOnMount };
