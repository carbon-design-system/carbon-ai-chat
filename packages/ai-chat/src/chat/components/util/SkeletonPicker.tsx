/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import AISkeletonPlaceholder from "../../components/carbon/AISkeletonPlaceholder";
import AISkeletonText from "../../components/carbon/AISkeletonText";
import CarbonSkeletonText from "../../components/carbon/SkeletonText";
import CarbonSkeletonPlaceholder from "../../components/carbon/SkeletonPlaceholder";
import React from "react";
import { useSelector } from "../../hooks/useSelector";

import { AppState } from "../../../types/state/AppState";

function SkeletonText(props: any) {
  const aiEnabled = useSelector(
    (state: AppState) => state.config.derived.themeWithDefaults.aiEnabled,
  );
  return aiEnabled ? (
    <AISkeletonText {...props} />
  ) : (
    <CarbonSkeletonText {...props} />
  );
}

function SkeletonPlaceholder(props: any) {
  const aiEnabled = useSelector(
    (state: AppState) => state.config.derived.themeWithDefaults.aiEnabled,
  );
  return aiEnabled ? (
    <AISkeletonPlaceholder {...props} />
  ) : (
    <CarbonSkeletonPlaceholder {...props} />
  );
}

export { SkeletonText, SkeletonPlaceholder };
