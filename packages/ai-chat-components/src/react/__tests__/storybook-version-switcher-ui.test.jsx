/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { VersionSwitcher } from '../../../.storybook/version-switcher';

jest.mock('storybook/manager-api', () => ({
  addons: {},
  types: {},
}));

let container;
let root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  delete globalThis.fetch;
});

test('shows a disabled current label when the versions request fails', async () => {
  globalThis.fetch = jest.fn().mockResolvedValue({ ok: false });
  await act(async () => {
    root.render(<VersionSwitcher flavor="web-components" />);
  });

  const select = container.querySelector('select');
  expect(select.disabled).toBe(true);
  expect(select.getAttribute('aria-label')).toBe(
    'Select @carbon/ai-chat-components version'
  );
  expect(container.textContent).toContain('Opens Storybook home');
  expect(select.options).toHaveLength(1);
  expect(select.options[0].textContent).toBe('Local');
});

test('keeps the current label when the published list is malformed', async () => {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: true,
    text: () =>
      Promise.resolve('export const AI_CHAT_COMPONENTS_VERSIONS = [];'),
  });
  await act(async () => {
    root.render(<VersionSwitcher flavor="web-components" />);
  });

  const select = container.querySelector('select');
  expect(select.disabled).toBe(true);
  expect(select.options[0].textContent).toBe('Local');
});

test('aborts a stalled versions request after five seconds', async () => {
  jest.useFakeTimers();
  let requestSignal;
  globalThis.fetch = jest.fn().mockImplementation((url, { signal }) => {
    requestSignal = signal;
    return new Promise(() => {});
  });

  await act(async () => root.render(<VersionSwitcher flavor="react" />));
  act(() => jest.advanceTimersByTime(5000));
  expect(requestSignal.aborted).toBe(true);
  expect(container.querySelector('select').disabled).toBe(true);
  jest.useRealTimers();
});

test('loads the published choices and aborts the request on unmount', async () => {
  let pendingSignal;
  globalThis.fetch = jest.fn().mockImplementation((url, { signal }) => {
    pendingSignal = signal;
    return Promise.resolve({
      ok: true,
      text: () =>
        Promise.resolve(
          "export const AI_CHAT_COMPONENTS_VERSIONS = ['v1.11.0'];"
        ),
    });
  });
  await act(async () => {
    root.render(<VersionSwitcher flavor="react" />);
  });

  const select = container.querySelector('select');
  expect(select.disabled).toBe(false);
  expect([...select.options].map((option) => option.textContent)).toEqual([
    'Local',
    'Pre-release',
    'v1.11.0',
  ]);

  await act(async () => root.unmount());
  expect(pendingSignal.aborted).toBe(true);
  root = createRoot(container);
});

test('opens the React version home without carrying story state', async () => {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: true,
    text: () =>
      Promise.resolve(
        "export const AI_CHAT_COMPONENTS_VERSIONS = ['v1.11.0'];"
      ),
  });
  const navigate = jest
    .spyOn(window.location, 'assign')
    .mockImplementation(() => {});
  await act(async () => root.render(<VersionSwitcher flavor="react" />));

  const select = container.querySelector('select');
  await act(async () => {
    select.value = 'v1.11.0';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(navigate).toHaveBeenCalledWith(
    'https://chat.carbondesignsystem.com/components/storybook/react/version/v1.11.0/index.html'
  );
  navigate.mockRestore();
});

test('ignores a response that arrives after unmount', async () => {
  let resolveFetch;
  globalThis.fetch = jest.fn().mockReturnValue(
    new Promise((resolve) => {
      resolveFetch = resolve;
    })
  );

  await act(async () => root.render(<VersionSwitcher flavor="react" />));
  await act(async () => root.unmount());
  await act(async () => {
    resolveFetch({
      ok: true,
      text: () =>
        Promise.resolve(
          "export const AI_CHAT_COMPONENTS_VERSIONS = ['v1.11.0'];"
        ),
    });
  });

  expect(container.querySelector('select')).toBeNull();
  root = createRoot(container);
});
