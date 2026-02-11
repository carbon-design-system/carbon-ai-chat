/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useEffect } from "react";

interface UseResizeObserverProps {
  containerRef: React.RefObject<HTMLElement | null>;
  onResize: () => void;
}

/**
 * Custom hook to observe resize events on a container element
 */
export function useResizeObserver({
  containerRef,
  onResize,
}: UseResizeObserverProps): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    // Use requestAnimationFrame to avoid ResizeObserver loop errors
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        onResize();
      });
    });
    observer.observe(container);

    // Call onResize immediately to set initial dimensions
    onResize();

    return () => observer.disconnect();
  }, [containerRef, onResize]);
}

// Made with Bob
