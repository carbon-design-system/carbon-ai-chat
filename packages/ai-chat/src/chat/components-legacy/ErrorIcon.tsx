/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import ErrorFilled16 from "@carbon/icons/es/error--filled/16.js";
import { carbonIconToReact } from "../utils/carbonIcon";
import cx from "classnames";
import React from "react";

import { HasClassName } from "../../types/utilities/HasClassName";

const ErrorFilled = carbonIconToReact(ErrorFilled16);

function ErrorIcon(props: HasClassName) {
  return (
    <ErrorFilled className={cx("cds-aichat--error-icon", props.className)} />
  );
}

export { ErrorIcon };
