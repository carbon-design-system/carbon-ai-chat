/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  composerHasFocus,
  requestComposerFocus,
} from '../../../src/chat/utils/customPromptLine';
import { getDeepActiveElement } from '../../../src/chat/utils/domUtils';
import type { ServiceManager } from '../../../src/chat/services/ServiceManager';
import { WriteableElementName } from '../../../src/types/instance/WriteableElements';
import actions from '../../../src/chat/store/actions';
import { makeConfigStore } from '../../test_helpers';

function setup(visible = true) {
  const store = makeConfigStore({ input: { isVisible: visible } });
  store.dispatch(
    actions.changeState({
      persistedToBrowserStorage: { viewState: { mainWindow: true } },
    })
  );
  const host = document.createElement('div');
  const builtIn = document.createElement('input');
  const outside = document.createElement('button');
  document.body.append(host, builtIn, outside);
  const inputComponent = {
    hasFocus: jest.fn(() => document.activeElement === builtIn),
    requestFocus: jest.fn(() => {
      builtIn.focus();
      return true;
    }),
  };
  const manager = {
    store,
    inputComponent,
    writeableElements: {
      [WriteableElementName.CUSTOM_PROMPT_LINE]: host,
    },
  } as unknown as ServiceManager;
  outside.focus();
  return { manager, store, host, builtIn, outside, inputComponent };
}

beforeEach(() => {
  // jsdom has no layout; tabbable requires a rendered rectangle.
  const rectangle = document.body.getBoundingClientRect();
  jest
    .spyOn(HTMLElement.prototype, 'getClientRects')
    .mockReturnValue(Object.assign([rectangle], { item: () => rectangle }));
});

afterEach(() => {
  document.body.replaceChildren();
  jest.restoreAllMocks();
});

it('delegates to the built-in composer when custom content is absent', () => {
  const { manager, builtIn, inputComponent } = setup();
  expect(composerHasFocus(manager)).toBe(false);
  expect(requestComposerFocus(manager)).toBe(true);
  expect(document.activeElement).toBe(builtIn);
  expect(composerHasFocus(manager)).toBe(true);
  expect(inputComponent.requestFocus).toHaveBeenCalledTimes(1);
  manager.inputComponent = null;
  expect(composerHasFocus(manager)).toBe(false);
  expect(requestComposerFocus(manager)).toBe(false);
});

it('focuses a custom control that is itself the supplied content', () => {
  const { manager, host, outside, inputComponent } = setup();
  const input = document.createElement('input');
  host.append(input);
  expect(composerHasFocus(manager)).toBe(false);
  expect(requestComposerFocus(manager)).toBe(true);
  expect(document.activeElement).toBe(input);
  expect(composerHasFocus(manager)).toBe(true);
  expect(requestComposerFocus(manager)).toBe(true);
  expect(inputComponent.requestFocus).not.toHaveBeenCalled();
  outside.focus();
  expect(composerHasFocus(manager)).toBe(false);
});

it('finds and recognizes custom focus across nested shadow roots', () => {
  const { manager, host, outside } = setup();
  const outer = document.createElement('div');
  const inner = document.createElement('div');
  const input = document.createElement('input');
  outer.attachShadow({ mode: 'open' }).append(inner);
  inner.attachShadow({ mode: 'open' }).append(input);
  host.append(outer);
  expect(requestComposerFocus(manager)).toBe(true);
  expect(getDeepActiveElement()).toBe(input);
  expect(composerHasFocus(manager)).toBe(true);
  outside.focus();
  expect(composerHasFocus(manager)).toBe(false);
});

it('honors the active visibility override above the config baseline', () => {
  const { manager, store, host, outside } = setup(false);
  const input = document.createElement('input');
  host.append(input);
  expect(requestComposerFocus(manager)).toBe(false);
  expect(document.activeElement).toBe(outside);
  store.dispatch(actions.updateInputState({ fieldVisible: true }, false));
  expect(requestComposerFocus(manager)).toBe(true);
  expect(document.activeElement).toBe(input);
  outside.focus();
  store.dispatch(actions.updateInputState({ fieldVisible: false }, false));
  expect(requestComposerFocus(manager)).toBe(false);
  expect(document.activeElement).toBe(outside);
});

it('leaves focus in place when the main window is hidden', () => {
  const { manager, store, host, outside } = setup();
  host.append(document.createElement('input'));
  store.dispatch(
    actions.changeState({
      persistedToBrowserStorage: { viewState: { mainWindow: false } },
    })
  );
  expect(requestComposerFocus(manager)).toBe(false);
  expect(document.activeElement).toBe(outside);
});

it('leaves focus in place for custom content with no focusable control', () => {
  const { manager, host, outside, inputComponent } = setup();
  host.append('Custom content', document.createElement('span'));
  expect(requestComposerFocus(manager)).toBe(false);
  expect(document.activeElement).toBe(outside);
  expect(composerHasFocus(manager)).toBe(false);
  expect(inputComponent.requestFocus).not.toHaveBeenCalled();
});
