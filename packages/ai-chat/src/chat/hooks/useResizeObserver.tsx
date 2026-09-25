/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useEffect } from 'react';
import { observeResize } from '../utils/resizeObserver';

interface UseResizeObserverProps {
  containerRef: React.RefObject<HTMLElement | null>;
  onResize: () => void;
}

export function useResizeObserver({
  containerRef,
  onResize,
}: UseResizeObserverProps): void {
  useEffect(
    () => observeResize(containerRef.current, onResize),
    [containerRef, onResize]
  );
}
