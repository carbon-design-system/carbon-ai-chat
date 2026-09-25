/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { renderHook } from '@testing-library/react';
import { usePanelCallbacks } from '../../../src/chat/hooks/usePanelCallbacks';

function panelEvent(isReactivation: boolean) {
  return new CustomEvent('panel-lifecycle', { detail: { isReactivation } });
}

describe('panel focus lifecycle callbacks', () => {
  it('requests focus on a new opening but skips reactivation', () => {
    const requestFocus = jest.fn();
    const { result, rerender } = renderHook(() =>
      usePanelCallbacks({ requestFocus })
    );

    result.current.onPanelOpenEnd(panelEvent(false));
    rerender();
    result.current.onPanelOpenEnd(panelEvent(true));

    expect(requestFocus).toHaveBeenCalledTimes(1);
  });

  it('focuses a new opening even when no close event was delivered', () => {
    const requestFocus = jest.fn();
    const { result } = renderHook(() => usePanelCallbacks({ requestFocus }));

    result.current.onPanelOpenEnd(panelEvent(false));
    result.current.onPanelOpenEnd(panelEvent(true));
    result.current.onPanelOpenEnd(panelEvent(false));

    expect(requestFocus).toHaveBeenCalledTimes(2);
  });

  it('requests focus when an older panel omits lifecycle detail', () => {
    const requestFocus = jest.fn();
    const { result } = renderHook(() => usePanelCallbacks({ requestFocus }));

    result.current.onPanelOpenEnd(new CustomEvent('panel-lifecycle'));

    expect(requestFocus).toHaveBeenCalledTimes(1);
  });
});
