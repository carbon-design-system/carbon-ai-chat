/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { render, waitFor, act, cleanup } from '@testing-library/react';
import { deepQuerySelector } from '@carbon/ai-chat-components/es/globals/utils/dom-utils.js';
import { ChatContainer } from '../../../src/react/ChatContainer';
import { ChatContainerProps } from '../../../src/types/component/ChatContainer';
import { createBaseTestProps } from '../../test_helpers';
import { WriteableElementName } from '../../../src/types/instance/WriteableElements';
import { ChatInstance } from '../../../src/types/instance/ChatInstance';
import { setEnableDebugLog } from '../../../src/chat/utils/miscUtils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createBaseProps(): Partial<ChatContainerProps> {
  return { ...createBaseTestProps() };
}

async function renderAndGetInstance(
  extraProps: Partial<ChatContainerProps> = {}
): Promise<{ instance: ChatInstance; unmount: () => void }> {
  let capturedInstance: ChatInstance | null = null;

  const afterRender = jest.fn();
  const { unmount } = render(
    React.createElement(ChatContainer, {
      ...createBaseProps(),
      ...extraProps,
      onAfterRender: afterRender,
      onBeforeRender: (instance: ChatInstance) => {
        capturedInstance = instance;
        if (extraProps.onBeforeRender) {
          extraProps.onBeforeRender(instance);
        }
      },
    })
  );

  await waitFor(
    () => {
      expect(capturedInstance).not.toBeNull();
      expect(afterRender).toHaveBeenCalledTimes(1);
    },
    {
      timeout: 5000,
    }
  );

  return { instance: capturedInstance as ChatInstance, unmount };
}

/**
 * Mirrors hasMeaningfulContent from useWriteableElementPresence — the value
 * AppShell reads to decide whether to suppress the framework header.
 */
function hasMeaningfulContent(node: HTMLElement): boolean {
  return Array.from(node.childNodes).some((child) => {
    if (child.nodeType === Node.COMMENT_NODE) {
      return false;
    }
    if (child.nodeType === Node.TEXT_NODE) {
      return Boolean(child.textContent?.trim());
    }
    return child.nodeType === Node.ELEMENT_NODE;
  });
}

function customHeaderNode(instance: ChatInstance): HTMLElement {
  return (instance as any).serviceManager.writeableElements[
    WriteableElementName.CUSTOM_HEADER
  ];
}

function setHistoryMobile(instance: ChatInstance) {
  (instance as any).serviceManager.store.dispatch({
    type: 'SET_HISTORY_PANEL_OPTIONS',
    isMobile: true,
    isOpen: false,
  });
}

describe('CUSTOM_HEADER — content predicate', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('empty node reads as no content', () => {
    const node = document.createElement('div');
    expect(hasMeaningfulContent(node)).toBe(false);
  });

  it('element child reads as content', () => {
    const node = document.createElement('div');
    node.appendChild(document.createElement('div'));
    expect(hasMeaningfulContent(node)).toBe(true);
  });

  it('whitespace-only text node reads as no content', () => {
    const node = document.createElement('div');
    node.appendChild(document.createTextNode('   '));
    expect(hasMeaningfulContent(node)).toBe(false);
  });

  it('non-empty text node reads as content', () => {
    const node = document.createElement('div');
    node.appendChild(document.createTextNode('Hello'));
    expect(hasMeaningfulContent(node)).toBe(true);
  });

  it('comment node reads as no content', () => {
    const node = document.createElement('div');
    node.appendChild(document.createComment('comment'));
    expect(hasMeaningfulContent(node)).toBe(false);
  });

  it('the eagerly-created host node from loadServices reads as empty', async () => {
    // The node is a bare div with no children. The framework header must not be
    // suppressed until the host actually writes content into it.
    const { instance } = await renderAndGetInstance({ header: { isOn: true } });
    expect(hasMeaningfulContent(customHeaderNode(instance))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Header replaced vs not replaced
// ---------------------------------------------------------------------------

describe('Header replaced vs not replaced', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('React host path: portal content lands in the host node, making it read as replaced', async () => {
    // The framework header guard (customHeaderPresent) derives from
    // hasMeaningfulContent on this node. Once the portal flushes, the node has
    // children and the guard suppresses <Header>.
    const { instance } = await renderAndGetInstance({
      header: { isOn: true },
      renderWriteableElements: {
        [WriteableElementName.CUSTOM_HEADER]: React.createElement(
          'div',
          null,
          'Custom Header'
        ),
      },
    } as any);

    const node = customHeaderNode(instance);
    await waitFor(() => {
      expect(hasMeaningfulContent(node)).toBe(true);
    });
  });

  it('WC host path: content appended directly to the node makes it read as replaced', async () => {
    // Web-component hosts write into the node directly (no portal). The result
    // is the same: the node has children and the guard suppresses <Header>.
    const { instance } = await renderAndGetInstance({ header: { isOn: true } });
    const node = customHeaderNode(instance);

    expect(hasMeaningfulContent(node)).toBe(false);

    await act(async () => {
      const child = document.createElement('div');
      child.textContent = 'Custom header';
      node.appendChild(child);
    });

    expect(hasMeaningfulContent(node)).toBe(true);
  });

  it('no content written: node reads as not replaced', async () => {
    const { instance } = await renderAndGetInstance({ header: { isOn: true } });
    expect(hasMeaningfulContent(customHeaderNode(instance))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Post-boot add/remove flip
// ---------------------------------------------------------------------------

describe('CUSTOM_HEADER — post-boot mutation', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('adding content after boot flips the node to replaced', async () => {
    const { instance } = await renderAndGetInstance({ header: { isOn: true } });
    const node = customHeaderNode(instance);

    expect(hasMeaningfulContent(node)).toBe(false);

    await act(async () => {
      const child = document.createElement('div');
      child.textContent = 'Added at runtime';
      node.appendChild(child);
    });

    expect(hasMeaningfulContent(node)).toBe(true);
  });

  it('removing content after boot flips the node back to not replaced', async () => {
    const { instance } = await renderAndGetInstance({ header: { isOn: true } });
    const node = customHeaderNode(instance);

    let child: HTMLElement;
    await act(async () => {
      child = document.createElement('div');
      child.textContent = 'Added at runtime';
      node.appendChild(child);
    });

    expect(hasMeaningfulContent(node)).toBe(true);

    await act(async () => {
      node.removeChild(child);
    });

    expect(hasMeaningfulContent(node)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// HeaderConfig.isOn
// ---------------------------------------------------------------------------

describe('isOn: false hides the header slot', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  async function renderElements(headerIsOn: boolean | undefined) {
    await renderAndGetInstance({
      ...(headerIsOn === undefined ? {} : { header: { isOn: headerIsOn } }),
      renderWriteableElements: {
        [WriteableElementName.CUSTOM_HEADER]: <div>Custom header</div>,
      },
    });
    return deepQuerySelector(document, 'cds-aichat-container').shadowRoot;
  }

  it('slot is present when isOn is unset (default on)', async () => {
    const root = await renderElements(undefined);
    expect(
      root.querySelector(`slot[name="${WriteableElementName.CUSTOM_HEADER}"]`)
    ).not.toBeNull();
  });

  it('slot is present when isOn: true', async () => {
    const root = await renderElements(true);
    expect(
      root.querySelector(`slot[name="${WriteableElementName.CUSTOM_HEADER}"]`)
    ).not.toBeNull();
  });

  it('slot is absent when isOn: false, even if the host wrote content', async () => {
    const root = await renderElements(false);
    expect(
      root.querySelector(`slot[name="${WriteableElementName.CUSTOM_HEADER}"]`)
    ).toBeNull();
  });

  it('slot is absent when isOn: false, even in mobile history state', async () => {
    // The isOn gate is evaluated before customHeaderPresent and the mobile-history
    // override, so isMobile cannot reinstate the header area when isOn is false.
    const { instance } = await renderAndGetInstance({
      header: { isOn: false },
      history: { isOn: true },
    });

    const node = customHeaderNode(instance);

    await act(async () => {
      setHistoryMobile(instance);
    });

    expect(hasMeaningfulContent(node)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Debug warning
// ---------------------------------------------------------------------------

describe('CUSTOM_HEADER — debug warning', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
    setEnableDebugLog(false);
  });

  it('fires once when debug is on, history is mobile, and a custom header is present', async () => {
    setEnableDebugLog(true);

    const { instance } = await renderAndGetInstance({
      header: { isOn: true },
      history: { isOn: true },
      debug: true,
    });

    const node = customHeaderNode(instance);

    await act(async () => {
      setHistoryMobile(instance);
      const child = document.createElement('div');
      child.textContent = 'Custom header';
      node.appendChild(child);
    });

    await waitFor(() => {
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('CUSTOM_HEADER is present')
      );
    });

    const callCount = (console.warn as jest.Mock).mock.calls.length;

    // Subsequent mutations must not re-fire (useRef guard).
    await act(async () => {
      node.appendChild(document.createElement('span'));
    });

    expect((console.warn as jest.Mock).mock.calls.length).toBe(callCount);
  });

  it('does not fire when debug is off', async () => {
    setEnableDebugLog(false);

    const { instance } = await renderAndGetInstance({
      header: { isOn: true },
      history: { isOn: true },
    });

    const node = customHeaderNode(instance);

    await act(async () => {
      setHistoryMobile(instance);
      const child = document.createElement('div');
      child.textContent = 'Custom header';
      node.appendChild(child);
    });

    await act(async () => {});

    const warnCalls = (console.warn as jest.Mock).mock.calls.filter((c) =>
      String(c[0]).includes('CUSTOM_HEADER')
    );
    expect(warnCalls.length).toBe(0);
  });
});
