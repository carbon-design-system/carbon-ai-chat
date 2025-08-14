/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  AISkeletonPlaceholder,
  AISkeletonText,
  SkeletonPlaceholder as CarbonSkeletonPlaceholder,
  SkeletonText as CarbonSkeletonText,
  SkeletonTextProps,
  AISkeletonTextProps,
} from "@carbon/react";
import { AISkeletonPlaceholderProps } from "@carbon/react/lib/components/AISkeleton/AISkeletonPlaceholder";
import { SkeletonPlaceholderProps } from "@carbon/react/lib/components/SkeletonPlaceholder/SkeletonPlaceholder";
import React from "react";
import { useSelector } from "react-redux";

import { AppState } from "../../../types/state/AppState";

function SkeletonText(props: SkeletonTextProps | AISkeletonTextProps) {
  const useAITheme = useSelector((state: AppState) => state.theme.useAITheme);
  return useAITheme ? (
    <AISkeletonText {...props} />
  ) : (
    <CarbonSkeletonText {...props} />
  );
}

function SkeletonPlaceholder(
  props: SkeletonPlaceholderProps | AISkeletonPlaceholderProps,
) {
  const useAITheme = useSelector((state: AppState) => state.theme.useAITheme);
  return useAITheme ? (
    <AISkeletonPlaceholder {...props} />
  ) : (
    <CarbonSkeletonPlaceholder {...props} />
  );
}

export { SkeletonText, SkeletonPlaceholder };
