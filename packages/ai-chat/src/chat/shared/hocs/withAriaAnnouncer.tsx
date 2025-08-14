/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This is a high order component that will inject a {@link AriaAnnouncerFunctionType} in to a component.
 */

import React, { useContext } from "react";

import {
  AriaAnnouncerContext,
  AriaAnnouncerFunctionType,
} from "../contexts/AriaAnnouncerContext";

/**
 * A simple interface that represents an injected announcer.
 */
interface HasAriaAnnouncer {
  /**
   * The announcer that was injected.
   */
  ariaAnnouncer: AriaAnnouncerFunctionType;
}

function withAriaAnnouncer<P extends HasAriaAnnouncer>(
  Component: React.ComponentType<P>,
) {
  // Drop the injected prop from the outer API
  type OuterProps = Omit<P, "ariaAnnouncer">;

  // Tell forwardRef: “I forward a ref of type unknown,
  // and I expect props = OuterProps”
  const Wrapped = React.forwardRef<unknown, OuterProps>((props, ref) => {
    const ariaAnnouncer = useContext(AriaAnnouncerContext);
    return (
      <Component
        {...(props as unknown as P)}
        ref={ref}
        ariaAnnouncer={ariaAnnouncer}
      />
    );
  });

  // for better DevTools names:
  Wrapped.displayName = `withAriaAnnouncer(${
    Component.displayName || Component.name || "Component"
  })`;

  return Wrapped;
}

export { withAriaAnnouncer, HasAriaAnnouncer };
