/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import AISkeletonPlaceholder from "../../react/carbon/AISkeletonPlaceholder";
import AISkeletonText from "../../react/carbon/AISkeletonText";
import CarbonSkeletonText from "../../react/carbon/SkeletonText";
import CarbonSkeletonPlaceholder from "../../react/carbon/SkeletonPlaceholder";
import React from "react";
import { useSelector } from "react-redux";

import { AppState } from "../../../types/state/AppState";

function SkeletonText(props: any) {
  const useAITheme = useSelector((state: AppState) => state.theme.useAITheme);
  return useAITheme ? (
    <AISkeletonText {...props} />
  ) : (
    <CarbonSkeletonText {...props} />
  );
}

function SkeletonPlaceholder(props: any) {
  const useAITheme = useSelector((state: AppState) => state.theme.useAITheme);
  return useAITheme ? (
    <AISkeletonPlaceholder {...props} />
  ) : (
    <CarbonSkeletonPlaceholder {...props} />
  );
}

export { SkeletonText, SkeletonPlaceholder };
