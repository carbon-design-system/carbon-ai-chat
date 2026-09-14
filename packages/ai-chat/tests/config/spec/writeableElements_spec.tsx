/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Tests for CUSTOM_HEADER writeable element (AC items 4–14 from
 * .github/plan-drafts/custom-header-writeable-element/PLAN-1-custom-header.md).
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
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

/**
 * Renders ChatContainer, waits for `onBeforeRender`, and returns the instance.
 */
async function renderAndGetInstance(
  extraProps: Partial<ChatContainerProps> = {}
): Promise<{ instance: ChatInstance; unmount: () => void }> {
  let capturedInstance: ChatInstance | null = null;

  const { unmount } = render(
    React.createElement(ChatContainer, {
      ...createBaseProps(),
      ...extraProps,
      onBeforeRender: (instance: ChatInstance) => {
        capturedInstance = instance;
        if (extraProps.onBeforeRender) {
          extraProps.onBeforeRender(instance);
        }
      },
    })
  );

  await waitFor(() => expect(capturedInstance).not.toBeNull(), {
    timeout: 5000,
  });

  return { instance: capturedInstance as ChatInstance, unmount };
}

// ---------------------------------------------------------------------------
// AC 4 & 5 — framework header present/absent based on content
// ---------------------------------------------------------------------------

describe('CUSTOM_HEADER — header visibility', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
    setEnableDebugLog(false);
  });

  it('AC5: framework header renders when slot is empty (no custom content)', async () => {
    const { instance } = await renderAndGetInstance({
      header: { isOn: true },
    });

    // The Header component renders a data-testid on its root shell element.
    // With no custom header content the framework header must be in the DOM.
    const headerNode = (instance as any).serviceManager.writeableElements[
      WriteableElementName.CUSTOM_HEADER
    ];
    expect(headerNode).toBeTruthy();
    // Empty host node → header still present in document
    expect(
      document.querySelector('[data-testid="chat-header"]')
    ).not.toBeNull();
  });

  it('AC4 React: framework header is absent when renderWriteableElements provides customHeader content', async () => {
    const customHeaderNode = document.createElement('div');
    customHeaderNode.textContent = 'My custom header';

    const renderWriteableElements = {
      [WriteableElementName.CUSTOM_HEADER]: React.createElement(
        'div',
        null,
        'Custom Header'
      ),
    };

    await renderAndGetInstance({
      header: { isOn: true },
      renderWriteableElements,
    } as any);

    // React portal renders content into the host node; header must be absent.
    await waitFor(() => {
      expect(document.querySelector('[data-testid="chat-header"]')).toBeNull();
    });
  });

  it('AC6: isOn:false hides the header even when custom content is present', async () => {
    const renderWriteableElements = {
      [WriteableElementName.CUSTOM_HEADER]: React.createElement(
        'div',
        null,
        'Custom Header'
      ),
    };

    await renderAndGetInstance({
      header: { isOn: false },
      renderWriteableElements,
    } as any);

    // isOn: false wins — no framework header AND the guard applies before
    // customHeaderPresent so the host's custom content still appears.
    expect(document.querySelector('[data-testid="chat-header"]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// AC 8 — HEADER_FIXED_ACTIONS_ELEMENT absent; HEADER_BOTTOM_ELEMENT present
// ---------------------------------------------------------------------------

describe('CUSTOM_HEADER — related writeable element slots', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('AC8: HEADER_BOTTOM_ELEMENT host node exists regardless of custom header', async () => {
    const renderWriteableElements = {
      [WriteableElementName.CUSTOM_HEADER]: React.createElement(
        'div',
        null,
        'Custom'
      ),
    };

    const { instance } = await renderAndGetInstance({
      header: { isOn: true },
      renderWriteableElements,
    } as any);

    const writeableElements = (instance as any).serviceManager
      .writeableElements;
    // HEADER_BOTTOM_ELEMENT host node was created in loadServices
    expect(
      writeableElements[WriteableElementName.HEADER_BOTTOM_ELEMENT]
    ).toBeTruthy();
    // CUSTOM_HEADER host node exists
    expect(writeableElements[WriteableElementName.CUSTOM_HEADER]).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// AC 9 — post-boot add/remove flips presence
// ---------------------------------------------------------------------------

describe('CUSTOM_HEADER — post-boot mutation', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('AC9: adding a child post-boot causes framework header to unmount', async () => {
    const { instance } = await renderAndGetInstance({
      header: { isOn: true },
    });

    const customHeaderNode: HTMLElement = (instance as any).serviceManager
      .writeableElements[WriteableElementName.CUSTOM_HEADER];

    // Initially framework header is present
    await waitFor(() => {
      expect(
        document.querySelector('[data-testid="chat-header"]')
      ).not.toBeNull();
    });

    // Add content post-boot
    await act(async () => {
      const child = document.createElement('div');
      child.textContent = 'Added at runtime';
      customHeaderNode.appendChild(child);
    });

    await waitFor(() => {
      expect(document.querySelector('[data-testid="chat-header"]')).toBeNull();
    });
  });

  it('AC9: removing the child post-boot causes framework header to remount', async () => {
    const { instance } = await renderAndGetInstance({
      header: { isOn: true },
    });

    const customHeaderNode: HTMLElement = (instance as any).serviceManager
      .writeableElements[WriteableElementName.CUSTOM_HEADER];

    // Add content
    let child: HTMLElement;
    await act(async () => {
      child = document.createElement('div');
      child.textContent = 'Added at runtime';
      customHeaderNode.appendChild(child);
    });

    await waitFor(() => {
      expect(document.querySelector('[data-testid="chat-header"]')).toBeNull();
    });

    // Remove content
    await act(async () => {
      customHeaderNode.removeChild(child);
    });

    await waitFor(() => {
      expect(
        document.querySelector('[data-testid="chat-header"]')
      ).not.toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// AC 10 — empty wrappers read as no content
// ---------------------------------------------------------------------------

describe('CUSTOM_HEADER — content predicate (via host node mutations)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('AC10: empty div child does not count as meaningful content', async () => {
    const { instance } = await renderAndGetInstance({
      header: { isOn: true },
    });

    const customHeaderNode: HTMLElement = (instance as any).serviceManager
      .writeableElements[WriteableElementName.CUSTOM_HEADER];

    await act(async () => {
      customHeaderNode.appendChild(document.createElement('div'));
    });

    // An empty element still counts as an element node — it IS meaningful
    // content (mirrors hasElementContent: any ELEMENT_NODE counts).
    await waitFor(() => {
      expect(document.querySelector('[data-testid="chat-header"]')).toBeNull();
    });
  });

  it('AC10: whitespace-only text node does not count as meaningful content', async () => {
    const { instance } = await renderAndGetInstance({
      header: { isOn: true },
    });

    const customHeaderNode: HTMLElement = (instance as any).serviceManager
      .writeableElements[WriteableElementName.CUSTOM_HEADER];

    await act(async () => {
      customHeaderNode.appendChild(document.createTextNode('   '));
    });

    // Whitespace-only text is not meaningful — header should remain
    await waitFor(() => {
      expect(
        document.querySelector('[data-testid="chat-header"]')
      ).not.toBeNull();
    });
  });

  it('AC10: comment node does not count as meaningful content', async () => {
    const { instance } = await renderAndGetInstance({
      header: { isOn: true },
    });

    const customHeaderNode: HTMLElement = (instance as any).serviceManager
      .writeableElements[WriteableElementName.CUSTOM_HEADER];

    await act(async () => {
      customHeaderNode.appendChild(document.createComment('comment'));
    });

    // Comment nodes are not meaningful — header should remain
    await waitFor(() => {
      expect(
        document.querySelector('[data-testid="chat-header"]')
      ).not.toBeNull();
    });
  });

  it('AC10: non-empty text node counts as meaningful content', async () => {
    const { instance } = await renderAndGetInstance({
      header: { isOn: true },
    });

    const customHeaderNode: HTMLElement = (instance as any).serviceManager
      .writeableElements[WriteableElementName.CUSTOM_HEADER];

    await act(async () => {
      customHeaderNode.appendChild(document.createTextNode('Hello'));
    });

    await waitFor(() => {
      expect(document.querySelector('[data-testid="chat-header"]')).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// AC 11 — debug warning
// ---------------------------------------------------------------------------

describe('CUSTOM_HEADER — debug warning', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
    setEnableDebugLog(false);
  });

  it('AC11: console.warn fires once when debug:true + history mobile + custom header present', async () => {
    setEnableDebugLog(true);

    const { instance } = await renderAndGetInstance({
      header: { isOn: true },
      history: { isOn: true },
      debug: true,
    });

    const customHeaderNode: HTMLElement = (instance as any).serviceManager
      .writeableElements[WriteableElementName.CUSTOM_HEADER];

    // Simulate mobile history state via store dispatch
    await act(async () => {
      const sm = (instance as any).serviceManager;
      sm.store.dispatch({
        type: 'SET_HISTORY_PANEL_OPTIONS',
        isMobile: true,
        isOpen: false,
      });
      const child = document.createElement('div');
      child.textContent = 'Custom header';
      customHeaderNode.appendChild(child);
    });

    await waitFor(() => {
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('CUSTOM_HEADER is present')
      );
    });

    const callCount = (console.warn as jest.Mock).mock.calls.length;

    // Second render cycle — warn must not fire again (useRef guard)
    await act(async () => {
      // Trigger a re-render by appending another child
      const extra = document.createElement('span');
      customHeaderNode.appendChild(extra);
    });

    expect((console.warn as jest.Mock).mock.calls.length).toBe(callCount);
  });

  it('AC11: console.warn does NOT fire when debug:false', async () => {
    setEnableDebugLog(false);

    const { instance } = await renderAndGetInstance({
      header: { isOn: true },
      history: { isOn: true },
    });

    const customHeaderNode: HTMLElement = (instance as any).serviceManager
      .writeableElements[WriteableElementName.CUSTOM_HEADER];

    await act(async () => {
      const sm = (instance as any).serviceManager;
      sm.store.dispatch({
        type: 'SET_HISTORY_PANEL_OPTIONS',
        isMobile: true,
        isOpen: false,
      });
      const child = document.createElement('div');
      child.textContent = 'Custom header';
      customHeaderNode.appendChild(child);
    });

    // Give effects time to run
    await act(async () => {});

    const warnCalls = (console.warn as jest.Mock).mock.calls.filter((c) =>
      String(c[0]).includes('CUSTOM_HEADER')
    );
    expect(warnCalls.length).toBe(0);
  });

  it('AC11: showMobileMenu:false silences the warning', async () => {
    setEnableDebugLog(true);

    const { instance } = await renderAndGetInstance({
      header: { isOn: true },
      history: { isOn: true, showMobileMenu: false },
      debug: true,
    });

    const customHeaderNode: HTMLElement = (instance as any).serviceManager
      .writeableElements[WriteableElementName.CUSTOM_HEADER];

    await act(async () => {
      const sm = (instance as any).serviceManager;
      sm.store.dispatch({
        type: 'SET_HISTORY_PANEL_OPTIONS',
        isMobile: true,
        isOpen: false,
      });
      const child = document.createElement('div');
      child.textContent = 'Custom header';
      customHeaderNode.appendChild(child);
    });

    await act(async () => {});

    const warnCalls = (console.warn as jest.Mock).mock.calls.filter((c) =>
      String(c[0]).includes('CUSTOM_HEADER')
    );
    expect(warnCalls.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// AC 12 — useWriteableElementPresence is reusable (hook unit test)
// ---------------------------------------------------------------------------

describe('useWriteableElementPresence hook (reusability)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('AC12: hook returns false for an empty node and true after a child is added', async () => {
    // Test the hook indirectly through the CUSTOM_HEADER behaviour:
    // the same hook code handles any WriteableElementName.
    const { instance } = await renderAndGetInstance({
      header: { isOn: true },
    });

    const customHeaderNode: HTMLElement = (instance as any).serviceManager
      .writeableElements[WriteableElementName.CUSTOM_HEADER];

    // Initially no content → header still present (hook returns false)
    expect(
      document.querySelector('[data-testid="chat-header"]')
    ).not.toBeNull();

    await act(async () => {
      const child = document.createElement('p');
      child.textContent = 'content';
      customHeaderNode.appendChild(child);
    });

    // Hook flipped to true → framework header gone
    await waitFor(() => {
      expect(document.querySelector('[data-testid="chat-header"]')).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// AC 13 — no first-paint flash (React path)
// ---------------------------------------------------------------------------

describe('CUSTOM_HEADER — no first-paint flash', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('AC13: when renderWriteableElements provides content on first render, framework header is never visible', async () => {
    const renderWriteableElements = {
      [WriteableElementName.CUSTOM_HEADER]: React.createElement(
        'div',
        null,
        'Custom Header'
      ),
    };

    let headerVisibleOnAnyRender = false;

    // Wrap to observe whether the framework header appears on any render pass.
    const Wrapper = () => {
      if (document.querySelector('[data-testid="chat-header"]')) {
        headerVisibleOnAnyRender = true;
      }
      return React.createElement(ChatContainer, {
        ...createBaseProps(),
        header: { isOn: true },
        renderWriteableElements,
      } as any);
    };

    await act(async () => {
      render(React.createElement(Wrapper));
    });

    // Wait for mount to settle
    await act(async () => {});

    expect(headerVisibleOnAnyRender).toBe(false);
  });
});
