/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useLayoutEffect, useRef } from 'react';
import { render } from '@testing-library/react';
import { PanelBodyContentAdapter } from '../../../src/chat/components/panels/PanelBodyContentAdapter';
import { setupAfterEach, setupBeforeEach } from '../../test_helpers';

describe('retained panel body content', () => {
  beforeEach(() => {
    setupBeforeEach();
  });

  afterEach(() => {
    setupAfterEach();
    jest.restoreAllMocks();
  });

  it('does not mount content in a detached native target', () => {
    const target = document.createElement('div');
    const effect = jest.fn();
    function Probe() {
      const ref = useRef<HTMLSpanElement>(null);
      useLayoutEffect(() => effect(ref.current.isConnected), []);
      return <span ref={ref}>retained</span>;
    }
    const tree = () => (
      <PanelBodyContentAdapter target={target}>
        <Probe />
      </PanelBodyContentAdapter>
    );
    const mounted = render(tree());
    expect(effect).not.toHaveBeenCalled();
    document.body.appendChild(target);
    mounted.rerender(tree());
    expect(effect.mock.calls).toEqual([[true]]);
  });
});
