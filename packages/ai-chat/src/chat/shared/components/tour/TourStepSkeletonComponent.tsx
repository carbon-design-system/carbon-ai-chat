/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import { SkeletonPlaceholder } from "../SkeletonPicker";

/**
 * This renders the skeleton of a step within the tour.
 */
function TourStepSkeletonComponent() {
  return (
    <div className="WACTourStep WACTourStep__Skeleton">
      <SkeletonPlaceholder className="WACTourStep__SkeletonPlaceholder" />
    </div>
  );
}

export { TourStepSkeletonComponent };
