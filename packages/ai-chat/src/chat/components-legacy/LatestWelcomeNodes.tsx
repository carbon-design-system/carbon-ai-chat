/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This component is used to render an element above the most recent welcome node. This element is exposed to Deb for
 * her to do what she likes. The element is stored in the serviceManager and set in Chat.ts.
 */

import React from "react";

import { WriteableElementName } from "../../types/instance/ChatInstance";
import { useServiceManager } from "../hooks/useServiceManager";
import { HasChildren } from "../../types/utilities/HasChildren";
import WriteableElement from "./WriteableElement";

interface LatestWelcomeNodesProps extends HasChildren {
  /**
   * The id of the message that is to be rendered by this component.
   */
  welcomeNodeBeforeElement: Element;
}

function LatestWelcomeNodes({ children }: LatestWelcomeNodesProps) {
  const { namespace } = useServiceManager();

  return (
    <>
      <WriteableElement
        slotName={WriteableElementName.WELCOME_NODE_BEFORE_ELEMENT}
        id={`welcomeNodeBeforeElement${namespace.suffix}`}
      />
      {children}
    </>
  );
}

export default React.memo(LatestWelcomeNodes);
