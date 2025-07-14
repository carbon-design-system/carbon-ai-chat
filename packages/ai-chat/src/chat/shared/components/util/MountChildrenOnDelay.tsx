/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This component will only mount its children after a certain amount of time has passed.
 */

import { PureComponent } from "react";

interface MountChildrenOnDelayProps {
  /**
   * The amount of time to wait in milliseconds before mounting the children. This defaults to 500.
   */
  delay?: number;

  /**
   * Children to be shown.
   */
  children: JSX.Element | JSX.Element[];
}

interface MountChildrenOnDelayState {
  /**
   * Indicates if the delay has passed and the children should be mounted.
   */
  showChildren: boolean;
}

class MountChildrenOnDelay extends PureComponent<
  MountChildrenOnDelayProps,
  MountChildrenOnDelayState
> {
  static defaultProps = { delay: 500 };

  public readonly state: Readonly<MountChildrenOnDelayState> = {
    showChildren: false,
  };
  private onComponentDidMount: ReturnType<typeof setTimeout>;

  componentDidMount(): void {
    // Once the component is mounted, start the countdown.
    this.onComponentDidMount = setTimeout(() => {
      this.setState({ showChildren: true });
    }, this.props.delay);
  }

  // If we unmount before the delay runs out, we can get browser errors if we don't clear.
  componentWillUnmount(): void {
    clearTimeout(this.onComponentDidMount);
    this.onComponentDidMount = undefined;
  }

  render() {
    if (!this.state.showChildren) {
      return false;
    }
    return this.props.children;
  }
}

export { MountChildrenOnDelay };
