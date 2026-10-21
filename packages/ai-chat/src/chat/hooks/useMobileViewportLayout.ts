/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useEffect } from 'react';
import type React from 'react';
import { connectMobileViewportLayout } from '../utils/mobileViewportLayout';

interface UseMobileViewportLayoutArgs {
  enabled: boolean;
  containerRef: React.RefObject<HTMLElement>;
  margin?: number;
}

export function useMobileViewportLayout({
  enabled,
  containerRef,
  margin = 4,
}: UseMobileViewportLayoutArgs): void {
  useEffect(
    () => connectMobileViewportLayout(enabled, containerRef.current, margin),
    [enabled, containerRef, margin]
  );
}
