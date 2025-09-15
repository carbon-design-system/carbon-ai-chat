/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This component is used to render custom elements stored in the serviceManager and set in Chat.ts.
 * It adds a container element around the host element which in turn can be used by the external page for adding its
 * own custom elements below it.
 */

import React from "react";

import { HasClassName } from "../../../types/utilities/HasClassName";

interface WriteableElementProps extends HasClassName {
  /**
   * An optional id to add to the element container.
   */
  id?: string;

  /**
   * If we are in shadowRoot, the slot name to render to.
   */
  slotName: string;
}

function WriteableElement({ slotName, id, className }: WriteableElementProps) {
  // Attach the host element to the ref for this component.

  return (
    <div className={className} id={id} data-floating-menu-container>
      <slot name={slotName} />
    </div>
  );
}

export default React.memo(WriteableElement);
