/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * A `--cds-aichat-*` token a host page sets reaches the painted chat. The
 * launcher button reads `var(--cds-aichat-launcher-color-background, …)`, and
 * the value has to inherit through two shadow boundaries: the chat's render
 * root and the button's own shadow root. Only a real browser computes that.
 */

import React from 'react';
import { render } from '@testing-library/react';

import '../cds-aichat-container';
import { ChatContainer } from '../../react/ChatContainer';
import type { PublicConfig } from '../../types/config/PublicConfig';
import { PageObjectId } from '../../testing/PageObjectId';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../chat/__tests__/helpers/chat';
import { untilCalled, untilDom } from '../../chat/__tests__/helpers/waits';

// A distinctive color that is not any Carbon default, so a match is
// unambiguous.
const OVERRIDE = 'rgb(255, 0, 255)';
const TOKEN = '--cds-aichat-launcher-color-background';

// The float layout renders the launcher.
const config = (): PublicConfig => ({
  ...createBaseConfig(),
  openChatByDefault: false,
});

async function bootReact() {
  const after = vi.fn();
  render(<ChatContainer {...config()} onAfterRender={after} />);
  await untilCalled(after);
}

async function bootElement() {
  const after = vi.fn();
  const element = document.createElement('cds-aichat-container');
  element.config = config();
  element.onBeforeRender = (): void => undefined;
  element.onAfterRender = after;
  document.body.appendChild(element);
  await untilCalled(after);
}

/** The launcher, wherever the host's shadow roots put it. */
function findLauncher(root: ParentNode = document): HTMLElement | null {
  const direct = root.querySelector<HTMLElement>(
    `[data-testid="${PageObjectId.LAUNCHER}"]`
  );
  if (direct) {
    return direct;
  }
  for (const element of root.querySelectorAll('*')) {
    const found = element.shadowRoot && findLauncher(element.shadowRoot);
    if (found) {
      return found;
    }
  }
  return null;
}

/** The painted background of the launcher button's inner `part`. */
function launcherBackground(launcher: HTMLElement): string | null {
  const root = launcher.shadowRoot;
  const button =
    root?.querySelector('[part~="button"]') ?? root?.querySelector('button');
  return button ? getComputedStyle(button).backgroundColor : null;
}

beforeEach(() => {
  setupBeforeEach();
  window.sessionStorage.clear();
  window.localStorage.clear();
});

afterEach(() => {
  setupAfterEach();
  document.documentElement.style.removeProperty(TOKEN);
  window.sessionStorage.clear();
  window.localStorage.clear();
});

it.each([
  ['ChatContainer', bootReact],
  ['cds-aichat-container', bootElement],
] as const)(
  'a host-page CSS custom property overrides a --cds-aichat-* token in the running chat (%s)',
  async (_name, boot) => {
    await boot();
    let launcher: HTMLElement;
    await untilDom(document.body, () => {
      launcher = findLauncher();
      expect(launcher).not.toBeNull();
      expect(launcherBackground(launcher)).not.toBeNull();
    });
    const box = launcher.getBoundingClientRect();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);

    // Baseline: the launcher paints the built-in default (Carbon
    // button-primary), not the override color.
    const before = launcherBackground(launcher);
    expect(before).not.toBe(OVERRIDE);
    expect(before).not.toBe('rgba(0, 0, 0, 0)');

    // The DOM equivalent of a page stylesheet rule
    // `:root { --cds-aichat-launcher-color-background: … }`.
    document.documentElement.style.setProperty(TOKEN, OVERRIDE);

    await expect.poll(() => launcherBackground(launcher)).toBe(OVERRIDE);
  }
);
