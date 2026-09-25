/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useEffect, useRef, useState } from 'react';
import { useSyncExternalStore } from 'use-sync-external-store/shim/index.js';
import {
  WindowOpenState,
  WindowOpenStateOptions,
} from '../services/windowOpenState';

export function useWindowOpenState(options: WindowOpenStateOptions) {
  const widgetContainerRef = useRef<HTMLElement | null>(null);
  const [controller] = useState(
    () => new WindowOpenState(options, () => widgetContainerRef.current)
  );
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot
  );

  useEffect(() => {
    controller.connect();
    return () => controller.disconnect();
  }, [controller]);

  const {
    viewStateMainWindow,
    isHydrated,
    useCustomHostElement,
    requestFocus,
  } = options;
  useEffect(() => {
    controller.update({
      viewStateMainWindow,
      isHydrated,
      useCustomHostElement,
      requestFocus,
    });
  }, [
    controller,
    viewStateMainWindow,
    isHydrated,
    useCustomHostElement,
    requestFocus,
  ]);

  return {
    ...snapshot,
    setIsHydrationAnimationComplete: controller.setIsHydrationAnimationComplete,
    widgetContainerRef,
  };
}
