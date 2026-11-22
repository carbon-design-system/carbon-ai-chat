/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { fixture, flush, setupNativePanelFixture } from './nativePanelFixture';
import { ChatWidthBreakpoint } from '../../../../types/state/AppState';
import { BusEventType } from '../../../../types/events/eventBusTypes';
import {
  applyConfigChange,
  makeConfigStore,
} from '../../../__tests__/helpers/chat';
import { viewActions } from '../../../state';

setupNativePanelFixture();

describe('native panel composition', () => {
  it('keeps committed targets and tokens through a same-task physical move', async () => {
    const f = await fixture();
    await f.commit();
    const initialSubscriptions = f.subscriptions.size;
    const request = f.hosts
      .getPanelContentSnapshot()
      .find((item) => item.panel === 'custom');
    const body = f.hosts.panelTargetFor('custom-body');
    const retained = document.createElement('input');
    retained.value = 'retained';
    body.append(retained);
    f.view.remove();
    f.shell.append(f.view);
    await flush(f.view);
    expect(
      f.hosts.getPanelContentSnapshot().find((item) => item.panel === 'custom')
    ).toBe(request);
    expect(
      f.hosts.isPanelContentCommitted('custom', f.view.inputs.contentRevision)
    ).toBe(true);
    expect(f.hosts.panelTargetFor('custom-body')).toBe(body);
    expect(body.querySelector('input')).toBe(retained);
    expect(retained.value).toBe('retained');
    expect(f.subscriptions.size).toBe(initialSubscriptions);
  });

  it('waits for the matching retained layout commit on later opens and rejects retired revisions', async () => {
    const f = await fixture();
    await f.commit();
    const first = f.hosts.panelTargetFor('custom-body');
    const input = document.createElement('input');
    input.value = 'kept';
    first.append(input);
    f.view.inputs = {
      ...f.view.inputs,
      customPanelState: { ...f.view.inputs.customPanelState, isOpen: true },
      contentRevision: {},
    };
    await flush(f.view);
    const stale = f.hosts
      .getPanelContentSnapshot()
      .find((request) => request.panel === 'custom');
    expect(f.panel('custom').open).toBe(false);
    expect(f.callbacks.fireCustomPanelEvent).not.toHaveBeenCalled();
    f.view.inputs = { ...f.view.inputs, contentRevision: {} };
    await flush(f.view);
    expect(f.hosts.commitPanelContent(stale)).toBe(false);
    expect(f.panel('custom').open).toBe(false);
    await f.commit();
    expect(f.panel('custom').open).toBe(true);
    expect(f.callbacks.fireCustomPanelEvent).toHaveBeenCalledWith(
      BusEventType.CUSTOM_PANEL_PRE_OPEN
    );
    expect(f.hosts.panelTargetFor('custom-body')).toBe(first);
    expect(first.querySelector('input')).toBe(input);
    expect(input.value).toBe('kept');
  });

  it('keeps a higher frame open and lower frame inert until the whole retained commit is ready', async () => {
    const f = await fixture();
    await f.commit();
    f.view.inputs = {
      ...f.view.inputs,
      customPanelState: { ...f.view.inputs.customPanelState, isOpen: true },
    };
    await flush(f.view);
    const custom = f.panel('custom');
    f.view.inputs = {
      ...f.view.inputs,
      catastrophicErrorPanelState: {
        ...f.view.inputs.catastrophicErrorPanelState,
        isOpen: true,
      },
      contentRevision: {},
    };
    await flush(f.view);
    await f.commit();
    expect(custom.open).toBe(true);
    expect(custom.inert).toBe(true);
    f.view.inputs = {
      ...f.view.inputs,
      catastrophicErrorPanelState: {
        ...f.view.inputs.catastrophicErrorPanelState,
        isOpen: false,
      },
      contentRevision: {},
    };
    await flush(f.view);
    expect(f.panel('error').open).toBe(true);
    expect(custom.open).toBe(true);
    expect(custom.inert).toBe(true);
    const requests = f.hosts.getPanelContentSnapshot();
    const remaining = requests.find((request) => request.panel === 'iframe');
    for (const request of requests) {
      if (request !== remaining) {
        expect(f.hosts.commitPanelContent(request)).toBe(true);
      }
    }
    await flush(f.view);
    expect(f.panel('error').open).toBe(true);
    expect(custom.open).toBe(true);
    expect(custom.inert).toBe(true);
    expect(f.hosts.commitPanelContent(remaining)).toBe(true);
    await flush(f.view);
    expect(f.panel('error').open).toBe(false);
    expect(custom.open).toBe(true);
    expect(custom.inert).toBe(false);
  });

  it('delivers actual reactivation transitions only after the replacement content commits', async () => {
    const seed = makeConfigStore({}).getState();
    const f = await fixture({
      customPanelState: {
        ...seed.view.customPanelState,
        options: {
          ...seed.view.customPanelState.options,
          disableAnimation: true,
        },
      },
    });
    await f.commit();
    f.view.inputs = {
      ...f.view.inputs,
      customPanelState: { ...f.view.inputs.customPanelState, isOpen: true },
    };
    await flush(f.view);
    f.view.inputs = {
      ...f.view.inputs,
      catastrophicErrorPanelState: {
        ...f.view.inputs.catastrophicErrorPanelState,
        isOpen: true,
      },
      contentRevision: {},
    };
    await flush(f.view);
    await f.commit();
    expect(f.panel('custom').open).toBe(true);
    expect(f.panel('custom').inert).toBe(true);
    vi.advanceTimersByTime(600);
    await flush(f.view);
    f.callbacks.fireCustomPanelEvent.mockClear();
    f.callbacks.onPanelOpenEnd.mockClear();
    const observed: {
      target: EventTarget;
      lowerOpen: boolean;
      lowerInert: boolean;
      higherOpen: boolean;
      committed: boolean;
    }[] = [];
    f.callbacks.onPanelOpenEnd.mockImplementation((event) => {
      observed.push({
        target: event.currentTarget,
        lowerOpen: f.panel('custom').open,
        lowerInert: f.panel('custom').inert,
        higherOpen: f.panel('error').open,
        committed: f.hosts.isPanelContentCommitted(
          'custom',
          f.view.inputs.contentRevision
        ),
      });
    });
    f.view.inputs = {
      ...f.view.inputs,
      catastrophicErrorPanelState: {
        ...f.view.inputs.catastrophicErrorPanelState,
        isOpen: false,
      },
      contentRevision: {},
    };
    await flush(f.view);
    expect(f.panel('custom').open).toBe(true);
    expect(f.panel('custom').inert).toBe(true);
    expect(f.panel('error').open).toBe(true);
    vi.advanceTimersByTime(600);
    await flush(f.view);
    expect(
      f.hosts.isPanelContentCommitted('custom', f.view.inputs.contentRevision)
    ).toBe(false);
    expect(f.callbacks.fireCustomPanelEvent).not.toHaveBeenCalled();
    expect(f.callbacks.onPanelOpenEnd).not.toHaveBeenCalled();
    await f.commit();
    vi.advanceTimersByTime(600);
    await flush(f.view);
    expect(observed).toEqual([
      {
        target: f.panel('custom'),
        lowerOpen: true,
        lowerInert: false,
        higherOpen: false,
        committed: true,
      },
    ]);
    expect(
      f.callbacks.fireCustomPanelEvent.mock.calls.map(([type]) => type)
    ).toEqual([
      BusEventType.CUSTOM_PANEL_PRE_OPEN,
      BusEventType.CUSTOM_PANEL_OPEN,
    ]);
    expect(f.callbacks.onPanelOpenEnd).toHaveBeenCalledTimes(1);
    expect(
      f.callbacks.onPanelOpenEnd.mock.calls[0][0].detail.isReactivation
    ).toBe(true);
  });

  it('keeps currentTarget and physical close state available inside each transition callback', async () => {
    const seed = makeConfigStore({}).getState();
    const f = await fixture({
      customPanelState: {
        ...seed.view.customPanelState,
        isOpen: true,
        options: {
          ...seed.view.customPanelState.options,
          disableAnimation: true,
        },
      },
    });
    await f.commit();
    const custom = f.panel('custom');
    const observations: {
      target: EventTarget;
      open: boolean;
      committed: boolean;
    }[] = [];
    f.callbacks.onPanelCloseStart.mockImplementation((event) => {
      observations.push({
        target: event.currentTarget,
        open: custom.open,
        committed: f.hosts.isPanelContentCommitted(
          'custom',
          f.view.inputs.contentRevision
        ),
      });
    });
    f.view.inputs = {
      ...f.view.inputs,
      customPanelState: { ...f.view.inputs.customPanelState, isOpen: false },
      contentRevision: {},
    };
    await flush(f.view);
    expect(custom.open).toBe(true);
    expect(observations).toEqual([]);
    vi.advanceTimersByTime(600);
    await flush(f.view);
    expect(custom.open).toBe(true);
    await f.commit();
    expect(observations).toEqual([
      { target: custom, open: false, committed: true },
    ]);
  });

  it('keeps the native disclaimer footer disabled until read and preserves it across narrow updates', async () => {
    const f = await fixture();
    const button = f.view.disclaimerButton();
    expect(button.disabled).toBe(true);
    f.view
      .querySelector('cds-aichat-disclaimer-body')
      .observeScroll({ isScrollable: true, isAtBottom: false });
    await flush(f.view);
    expect(button.disabled).toBe(true);
    f.view
      .querySelector('cds-aichat-disclaimer-body')
      .observeScroll({ isScrollable: true, isAtBottom: true });
    await flush(f.view);
    expect(button.disabled).toBe(false);
    applyConfigChange(f.store, {
      ...f.store.getState().config.public,
      strings: {
        disclaimer_accept: 'Agree',
        disclaimer_acceptance_label: 'Accept terms',
      },
    });
    f.store.dispatch(
      viewActions.setViewValue('chatWidthBreakpoint', ChatWidthBreakpoint.WIDE)
    );
    await flush(f.view);
    expect(f.view.disclaimerButton()).toBe(button);
    expect(button.textContent).toBe('Agree');
    expect(button.getAttribute('aria-label')).toBe('Accept terms');
    expect(button.size).toBe('2xl');
    expect(button.disabled).toBe(false);
    button.click();
    expect(f.callbacks.onAcceptDisclaimer).toHaveBeenCalledTimes(1);
  });

  it('ignores unrelated typing, releases targets and subscriptions on detach, then reconnects current state once', async () => {
    const f = await fixture();
    const peak = f.subscriptions.size;
    const render = vi.spyOn(
      f.view as unknown as { renderView(): unknown },
      'renderView'
    );
    f.store.dispatch(viewActions.setViewValue('isMessageLoadingCounter', 1));
    await flush(f.view);
    expect(render).not.toHaveBeenCalled();
    const target = f.hosts.panelTargetFor('custom-body');
    const request = f.hosts
      .getPanelContentSnapshot()
      .find((item) => item.panel === 'custom');
    f.view.remove();
    await Promise.resolve();
    expect(f.subscriptions.size).toBe(0);
    expect(f.hosts.getPanelContentSnapshot()).toEqual([]);
    expect(f.hosts.commitPanelContent(request)).toBe(false);
    expect(f.view.requestPanelFocus('custom')).toBe(false);
    applyConfigChange(f.store, {
      ...f.store.getState().config.public,
      strings: { aria_customPanel: 'Updated custom' },
    });
    f.shell.append(f.view);
    await flush(f.view);
    expect(f.subscriptions.size).toBe(peak);
    expect(f.panel('custom').panelAriaLabel).toBe('Updated custom');
    expect(f.hosts.panelTargetFor('custom-body')).toBe(target);
    expect(f.errorOccurred).not.toHaveBeenCalled();
  });
});
