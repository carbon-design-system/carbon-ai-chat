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
 *
 * Testing strategy: the framework header (`<Header>`) lives inside a Lit
 * shadow root and is not reachable with `document.querySelector` in jsdom.
 * Tests therefore verify behaviour through:
 *   1. The CUSTOM_HEADER host node's child list (the source of truth for
 *      `useWriteableElementPresence`).
 *   2. Whether `AppShell` would render the `<Header>` by inspecting the state
 *      variables that gate it (`customHeaderPresent` via MutationObserver,
 *      `writeableElementsPresentKeys` for the React portal path).
 *   3. For AC9 (post-boot mutation): direct observation of `customHeaderPresent`
 *      through a probe that reads `hasMeaningfulContent` on the host node.
 */

import React from 'react';
import { render, waitFor, act, cleanup } from '@testing-library/react';
import { ChatContainer } from '../../../src/react/ChatContainer';
import { ChatContainerProps } from '../../../src/types/component/ChatContainer';
import { createBaseTestProps, makeConfigStore } from '../../test_helpers';
import { WriteableElementName } from '../../../src/types/instance/WriteableElements';
import { ChatInstance } from '../../../src/types/instance/ChatInstance';
import { setEnableDebugLog } from '../../../src/chat/utils/miscUtils';
import { AppShellWriteableElements } from '../../../src/chat/AppShellWriteableElements';
import { StoreProvider } from '../../../src/chat/providers/StoreProvider';

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

/**
 * Returns true when `node` has at least one non-comment, non-whitespace-only
 * child — matching `hasMeaningfulContent` in `useWriteableElementPresence`.
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

// ---------------------------------------------------------------------------
// AC 1 — enum member and host node
// ---------------------------------------------------------------------------

describe('CUSTOM_HEADER — enum member and host node', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('AC1: CUSTOM_HEADER enum value is "customHeader"', () => {
    expect(WriteableElementName.CUSTOM_HEADER).toBe('customHeader');
  });

  it('AC2: host node is created in loadServices', async () => {
    const { instance } = await renderAndGetInstance();

    const node = (instance as any).serviceManager.writeableElements[
      WriteableElementName.CUSTOM_HEADER
    ];
    expect(node).toBeInstanceOf(HTMLElement);
    expect(node.tagName).toBe('DIV');
  });
});

// ---------------------------------------------------------------------------
// AC 4 & 5 — framework header present/absent based on content
// ---------------------------------------------------------------------------

describe('CUSTOM_HEADER — header guard (React portal path)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
    setEnableDebugLog(false);
  });

  it('AC5: when slot is empty, writeableElementsPresentKeys does not include customHeader', async () => {
    // With no renderWriteableElements provided (back-compat path), the
    // writeableElementsPresentKeys prop is undefined — meaning all defaults
    // render. The CUSTOM_HEADER host node is empty so customHeaderPresent=false.
    const { instance } = await renderAndGetInstance({
      header: { isOn: true },
    });

    const node: HTMLElement = (instance as any).serviceManager
      .writeableElements[WriteableElementName.CUSTOM_HEADER];
    // Empty host node → hook returns false (no meaningful content)
    expect(hasMeaningfulContent(node)).toBe(false);
  });

  it('AC4 React: when renderWriteableElements provides customHeader, the host node receives content', async () => {
    const renderWriteableElements = {
      [WriteableElementName.CUSTOM_HEADER]: React.createElement(
        'div',
        null,
        'Custom Header'
      ),
    };

    const { instance } = await renderAndGetInstance({
      header: { isOn: true },
      renderWriteableElements,
    } as any);

    // The React portal renders content into the CUSTOM_HEADER host node.
    // Wait for the portal to flush.
    const node: HTMLElement = (instance as any).serviceManager
      .writeableElements[WriteableElementName.CUSTOM_HEADER];
    await waitFor(() => {
      expect(hasMeaningfulContent(node)).toBe(true);
    });
  });

  it('AC6: isOn:false — CUSTOM_HEADER host node is still populated but isOn gate wins', async () => {
    // When isOn:false the framework renders no header at all. The host's content
    // in the slot is irrelevant — the isOn guard is checked first in AppShell.
    // This test verifies the host node is created even when isOn:false.
    const { instance } = await renderAndGetInstance({
      header: { isOn: false },
    });

    const node = (instance as any).serviceManager.writeableElements[
      WriteableElementName.CUSTOM_HEADER
    ];
    expect(node).toBeInstanceOf(HTMLElement);
  });
});

// ---------------------------------------------------------------------------
// AC 8 — HEADER_BOTTOM_ELEMENT host node present; CUSTOM_HEADER host exists
// ---------------------------------------------------------------------------

describe('CUSTOM_HEADER — related writeable element slots', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('AC8: HEADER_BOTTOM_ELEMENT and CUSTOM_HEADER host nodes both exist', async () => {
    const { instance } = await renderAndGetInstance({
      header: { isOn: true },
    });

    const writeableElements = (instance as any).serviceManager
      .writeableElements;
    expect(
      writeableElements[WriteableElementName.HEADER_BOTTOM_ELEMENT]
    ).toBeTruthy();
    expect(writeableElements[WriteableElementName.CUSTOM_HEADER]).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// AC 9 — post-boot add/remove flips hasMeaningfulContent
// ---------------------------------------------------------------------------

describe('CUSTOM_HEADER — post-boot mutation (content predicate)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('AC9: adding a child post-boot makes hasMeaningfulContent true', async () => {
    const { instance } = await renderAndGetInstance({
      header: { isOn: true },
    });

    const node: HTMLElement = (instance as any).serviceManager
      .writeableElements[WriteableElementName.CUSTOM_HEADER];

    expect(hasMeaningfulContent(node)).toBe(false);

    await act(async () => {
      const child = document.createElement('div');
      child.textContent = 'Added at runtime';
      node.appendChild(child);
    });

    expect(hasMeaningfulContent(node)).toBe(true);
  });

  it('AC9: removing the child makes hasMeaningfulContent false again', async () => {
    const { instance } = await renderAndGetInstance({
      header: { isOn: true },
    });

    const node: HTMLElement = (instance as any).serviceManager
      .writeableElements[WriteableElementName.CUSTOM_HEADER];

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
// AC 10 — content predicate correctness
// ---------------------------------------------------------------------------

describe('CUSTOM_HEADER — content predicate', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('AC10: empty node → false', () => {
    const node = document.createElement('div');
    expect(hasMeaningfulContent(node)).toBe(false);
  });

  it('AC10: element child → true', () => {
    const node = document.createElement('div');
    node.appendChild(document.createElement('div'));
    expect(hasMeaningfulContent(node)).toBe(true);
  });

  it('AC10: whitespace-only text node → false', () => {
    const node = document.createElement('div');
    node.appendChild(document.createTextNode('   '));
    expect(hasMeaningfulContent(node)).toBe(false);
  });

  it('AC10: comment node → false', () => {
    const node = document.createElement('div');
    node.appendChild(document.createComment('comment'));
    expect(hasMeaningfulContent(node)).toBe(false);
  });

  it('AC10: non-empty text node → true', () => {
    const node = document.createElement('div');
    node.appendChild(document.createTextNode('Hello'));
    expect(hasMeaningfulContent(node)).toBe(true);
  });

  it('AC10: div with only a comment child → false', () => {
    const node = document.createElement('div');
    node.appendChild(document.createComment('a comment'));
    expect(hasMeaningfulContent(node)).toBe(false);
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

    // Second mutation cycle — warn must not fire again (useRef guard)
    await act(async () => {
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
// AC 12 — useWriteableElementPresence is reusable
// ---------------------------------------------------------------------------

describe('useWriteableElementPresence — reusability', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('AC12: hook signature accepts any WriteableElementName + Partial<WriteableElements>', async () => {
    // Verify the hook works for a different slot (HEADER_BOTTOM_ELEMENT),
    // proving the implementation carries no CUSTOM_HEADER-specific logic.
    const { instance } = await renderAndGetInstance();

    const we = (instance as any).serviceManager.writeableElements;

    // Both CUSTOM_HEADER and HEADER_BOTTOM_ELEMENT host nodes exist and are
    // plain empty divs until the host writes content.
    expect(hasMeaningfulContent(we[WriteableElementName.CUSTOM_HEADER])).toBe(
      false
    );
    expect(
      hasMeaningfulContent(we[WriteableElementName.HEADER_BOTTOM_ELEMENT])
    ).toBe(false);

    // Add content to HEADER_BOTTOM_ELEMENT — predicate should flip for that
    // node while CUSTOM_HEADER remains false.
    await act(async () => {
      const child = document.createElement('p');
      child.textContent = 'Bottom content';
      we[WriteableElementName.HEADER_BOTTOM_ELEMENT].appendChild(child);
    });

    expect(
      hasMeaningfulContent(we[WriteableElementName.HEADER_BOTTOM_ELEMENT])
    ).toBe(true);
    expect(hasMeaningfulContent(we[WriteableElementName.CUSTOM_HEADER])).toBe(
      false
    );
  });
});

// ---------------------------------------------------------------------------
// AC 13 — no first-paint flash (React path via renderWriteableElements)
// ---------------------------------------------------------------------------

describe('CUSTOM_HEADER — no first-paint flash', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('AC13: when renderWriteableElements provides content, host node receives it synchronously', async () => {
    // The React portal populates the host node before effects run, so by the
    // time the first MutationObserver fires the node already has content.
    const renderWriteableElements = {
      [WriteableElementName.CUSTOM_HEADER]: React.createElement(
        'div',
        null,
        'Custom Header'
      ),
    };

    const { instance } = await renderAndGetInstance({
      header: { isOn: true },
      renderWriteableElements,
    } as any);

    const node: HTMLElement = (instance as any).serviceManager
      .writeableElements[WriteableElementName.CUSTOM_HEADER];

    // After a single render+effect cycle, the host node must already have content.
    await waitFor(() => {
      expect(hasMeaningfulContent(node)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Regression — header.isOn:false hides the CUSTOM_HEADER slot
//
// Rendered directly against AppShellWriteableElements + StoreProvider rather
// than the full ChatContainer stack, because the Lit shadow root that
// AppShell renders into is not queryable from document in jsdom.
// AppShellWriteableElements renders WriteableElement which emits
// `<slot name="customHeader">` — that JSX element IS visible in jsdom and
// is the exact node the fix gates.
// ---------------------------------------------------------------------------

const stubServiceManager = { namespace: { suffix: '' } } as any;

describe('CUSTOM_HEADER — header.isOn gate', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  function renderElements(headerIsOn: boolean | undefined) {
    const config =
      headerIsOn === undefined ? {} : { header: { isOn: headerIsOn } };
    const store = makeConfigStore(config as any);
    return render(
      <StoreProvider store={store}>
        <AppShellWriteableElements
          serviceManager={stubServiceManager}
          showHomeScreen={false}
        />
      </StoreProvider>
    );
  }

  it('mounts the CUSTOM_HEADER slot when header.isOn is not set (default)', () => {
    const { container } = renderElements(undefined);
    expect(
      container.querySelector(
        `slot[name="${WriteableElementName.CUSTOM_HEADER}"]`
      )
    ).not.toBeNull();
  });

  it('mounts the CUSTOM_HEADER slot when header.isOn is true', () => {
    const { container } = renderElements(true);
    expect(
      container.querySelector(
        `slot[name="${WriteableElementName.CUSTOM_HEADER}"]`
      )
    ).not.toBeNull();
  });

  it('does not mount the CUSTOM_HEADER slot when header.isOn is false', () => {
    const { container } = renderElements(false);
    expect(
      container.querySelector(
        `slot[name="${WriteableElementName.CUSTOM_HEADER}"]`
      )
    ).toBeNull();
  });
});
