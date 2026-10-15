/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { Dimension } from '../../types/utilities/Dimension';

export function getWindowSize(
  target: Window | undefined = globalThis.window
): Dimension {
  return { width: target?.innerWidth ?? 0, height: target?.innerHeight ?? 0 };
}

export function observeWindowSize(
  onChange: (size: Dimension) => void,
  target: Window | undefined = globalThis.window
): () => void {
  if (!target) {
    return () => {};
  }
  const onResize = () => onChange(getWindowSize(target));
  target.addEventListener('resize', onResize);
  onResize();
  return () => target.removeEventListener('resize', onResize);
}
