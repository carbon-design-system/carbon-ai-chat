/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { autoUpdate, computePosition, flip, offset } from '@floating-ui/dom';
import { createOverflowHandler } from '@carbon/utilities';

function connectInputActionsOverflow(
  container: HTMLElement,
  nonFixedCount: number,
  onHiddenCount: (count: number) => void,
  onMeasuring: (measuring: boolean) => void,
  onError: (error: unknown) => void
): () => void {
  let connected = true;
  let handler: { disconnect(): void } | undefined;
  let revealFrame = 0;
  onMeasuring(true);
  const setupFrame = requestAnimationFrame(() => {
    if (!connected) {
      return;
    }
    try {
      handler = createOverflowHandler({
        container,
        dimension: 'width',
        onChange: (visibleItems) => {
          if (connected) {
            onHiddenCount(Math.max(0, nonFixedCount - visibleItems.length));
          }
        },
      });
      // The handler schedules its first measure before this reveal frame.
      revealFrame = requestAnimationFrame(() => {
        if (connected) {
          onMeasuring(false);
        }
      });
    } catch (error) {
      onError(error);
    }
  });
  return () => {
    if (!connected) {
      return;
    }
    connected = false;
    cancelAnimationFrame(setupFrame);
    cancelAnimationFrame(revealFrame);
    handler?.disconnect();
  };
}

function connectInputActionsMenu(
  trigger: HTMLElement,
  menu: HTMLElement & { updateComplete?: Promise<unknown> },
  onError: (error: unknown) => void
): () => void {
  let connected = true;
  let release: (() => void) | undefined;
  const report = (error: unknown) => {
    if (connected) {
      onError(error);
    }
  };
  void Promise.resolve(menu.updateComplete)
    .then(() => {
      if (!connected) {
        return;
      }
      const surface =
        menu.shadowRoot?.querySelector<HTMLElement>('[role="menu"]');
      if (!surface) {
        return;
      }
      release = autoUpdate(trigger, surface, () => {
        if (!connected) {
          return;
        }
        void computePosition(trigger, surface, {
          strategy: 'fixed',
          placement: 'top-start',
          middleware: [
            offset(4),
            flip({ fallbackPlacements: ['top', 'bottom'] }),
          ],
        })
          .then(({ x, y }) => {
            if (connected) {
              Object.assign(surface.style, {
                position: 'fixed',
                left: `${x}px`,
                top: `${y}px`,
                right: 'auto',
              });
            }
          })
          .catch(report);
      });
    })
    .catch(report);
  return () => {
    if (connected) {
      connected = false;
      release?.();
    }
  };
}

export { connectInputActionsOverflow, connectInputActionsMenu };
