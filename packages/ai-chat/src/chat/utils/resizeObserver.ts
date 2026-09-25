/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

export function observeResize(
  container: HTMLElement | null,
  onResize: () => void
): () => void {
  if (!container) {
    return () => {};
  }
  let connected = true;
  let frame: number | null = null;
  const observer = new ResizeObserver(() => {
    if (!connected || frame !== null) {
      return;
    }
    // Defer measurement to avoid ResizeObserver loop errors.
    frame = requestAnimationFrame(() => {
      frame = null;
      if (connected) {
        onResize();
      }
    });
  });
  observer.observe(container);
  onResize();
  return () => {
    connected = false;
    observer.disconnect();
    if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  };
}
