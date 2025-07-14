/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useRef } from "react";

import { uuid, UUIDType } from "../utils/lang/uuid";

/**
 * A hook that returns a UUID that lives for the life of the component.
 */
function useUUID() {
  const ref = useRef<string>();
  if (ref.current === undefined) {
    ref.current = uuid(UUIDType.COMPONENT);
  }

  return ref.current;
}

export { useUUID };
