/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cx from "classnames";
import React, { HTMLAttributes } from "react";

import { HideComponentContext } from "../../../contexts/HideComponentContext";
import { HasChildren } from "../../../../types/utilities/HasChildren";
import { HasClassName } from "../../../../types/utilities/HasClassName";

interface HideComponentProps
  extends HasClassName,
    HasChildren,
    HTMLAttributes<HTMLDivElement> {
  /**
   * Indicates if the top level element in this component should be hidden. This will use the "cds-aichat--hidden"
   * classname to hide the component. The result of this hiding can be accessed through the {@link HideComponentContext}
   * in child components.
   */
  hidden: boolean;
}

/**
 * This component is used to potentially hide it's children and to make that state available through context to all
 * of the component's children. Note that this does not currently work if you nest one of these components inside of
 * another one.
 */
function HideComponent(props: HideComponentProps) {
  const { hidden, children, className, ...htmlAttributes } = props;
  return (
    <HideComponentContext.Provider value={hidden}>
      <div
        className={cx(className, { "cds-aichat--hidden": hidden })}
        {...htmlAttributes}
      >
        {children}
      </div>
    </HideComponentContext.Provider>
  );
}

export { HideComponent };
