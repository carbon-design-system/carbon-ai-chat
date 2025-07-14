/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import ErrorFilled from "@carbon/icons-react/es/ErrorFilled.js";
import cx from "classnames";
import React from "react";

import { HasClassName } from "../../../types/utilities/HasClassName";

function ErrorIcon(props: HasClassName) {
  return <ErrorFilled className={cx("WACErrorIcon", props.className)} />;
}

export { ErrorIcon };
