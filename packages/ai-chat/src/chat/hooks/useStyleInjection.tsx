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
import { injectStyles, StyleInjectionOptions } from '../utils/styleInjection';

interface UseStyleInjectionProps extends Omit<
  StyleInjectionOptions,
  'container'
> {
  containerRef: React.RefObject<HTMLDivElement>;
}

export function useStyleInjection({
  containerRef,
  hostElement,
  cssVariableOverrideString,
  appStyles,
  applicationStylesheet,
  cssVariableOverrideStylesheet,
}: UseStyleInjectionProps): void {
  useEffect(() => {
    injectStyles({
      container: containerRef.current,
      hostElement,
      cssVariableOverrideString,
      appStyles,
      applicationStylesheet,
      cssVariableOverrideStylesheet,
    });
  }, [
    containerRef,
    hostElement,
    cssVariableOverrideString,
    appStyles,
    applicationStylesheet,
    cssVariableOverrideStylesheet,
  ]);
}
