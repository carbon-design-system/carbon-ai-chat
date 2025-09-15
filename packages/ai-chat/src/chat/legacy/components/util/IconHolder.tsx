/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

interface IconCircleProps {
  icon: React.ReactNode;
}

function IconHolder(props: IconCircleProps) {
  return <div className="cds-aichat--icon-holder">{props.icon}</div>;
}

export { IconHolder };
