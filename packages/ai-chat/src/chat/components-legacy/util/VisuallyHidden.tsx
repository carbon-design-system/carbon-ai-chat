/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This is a very simple component which simply renders an element that is visually hidden in the UI. This means
 * that the item is present in the DOM and is visible to screen readers but it is not visible to sighted users.
 */

import React from "react";

const VisuallyHidden = React.forwardRef(
  (props: any, ref: React.Ref<HTMLDivElement>) => {
    return (
      <div
        ref={ref}
        {...props}
        className={`cds-aichat--visually-hidden ${props.className || ""}`}
      >
        {props.children}
      </div>
    );
  },
);

VisuallyHidden.displayName = "VisuallyHidden";

export default VisuallyHidden;
