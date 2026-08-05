/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Regression test for #1910 — FooterButtonComponents must not mutate the
 * store-derived LocalMessageItem while rendering footer buttons.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { StoreProvider } from '../../../src/chat/providers/StoreProvider';
import { createAppStore } from '../../../src/chat/store/appStore';
import { FooterButtonComponents } from '../../../src/chat/components/responseTypes/button/FooterButtonComponents';
import { ButtonItemType } from '../../../src/types/messaging/Messages';
import type { LocalMessageItem } from '../../../src/types/messaging/LocalMessageItem';
import type { MessageTypeComponentProps } from '../../../src/types/messaging/MessageTypeComponentProps';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal no-op store that exposes `allMessageItemsByID`. */
function makeStore(allMessageItemsByID: Record<string, LocalMessageItem>) {
  return createAppStore<{
    allMessageItemsByID: Record<string, LocalMessageItem>;
  }>((state) => state, { allMessageItemsByID });
}

/** Build a minimal LocalMessageItem for a button response type. */
function makeButtonItem(id: string): LocalMessageItem {
  return {
    fullMessageID: 'msg-1',
    item: {
      response_type: 'button',
      button_type: ButtonItemType.POST_BACK,
      label: 'Click me',
    } as any,
    ui_state: { id },
  };
}

/** Build the parent LocalMessageItem that owns the footer button IDs. */
function makeParentItem(footerLocalMessageItemIDs: string[]): LocalMessageItem {
  return {
    fullMessageID: 'msg-1',
    item: { response_type: 'card' } as any,
    ui_state: { id: 'parent', footerLocalMessageItemIDs },
  };
}

/** A renderMessageComponent spy that records the messages it receives. */
function makeRenderSpy() {
  const received: LocalMessageItem[] = [];
  function renderMessageComponent(
    childProps: MessageTypeComponentProps & { isNestedMessageItem: boolean }
  ): React.ReactNode {
    received.push(childProps.message);
    return <div data-testid={`btn-${childProps.message.ui_state.id}`} />;
  }
  return { renderMessageComponent, received };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FooterButtonComponents', () => {
  it('does not mutate the store-derived LocalMessageItem during render', () => {
    const buttonItem = makeButtonItem('btn-1');
    const originalItemRef = buttonItem.item;

    const store = makeStore({ 'btn-1': buttonItem });

    render(
      <StoreProvider store={store}>
        <FooterButtonComponents
          message={makeParentItem(['btn-1'])}
          originalMessage={null as any}
          requestInputFocus={() => {}}
          disableUserInputs={false}
          isMessageForInput={true}
          scrollElementIntoView={() => {}}
          serviceManager={null as any}
          hideFeedback={false}
          showChainOfThought={false}
          allowNewFeedback={false}
          renderMessageComponent={makeRenderSpy().renderMessageComponent}
        />
      </StoreProvider>
    );

    // The store item's `item` reference must be the same object as before.
    expect(buttonItem.item).toBe(originalItemRef);
    // No `is` field should have been injected onto the stored item.
    expect((buttonItem.item as any).is).toBeUndefined();
  });

  it('passes is: standard-button to renderMessageComponent without touching the store object', () => {
    const buttonItem = makeButtonItem('btn-1');
    const store = makeStore({ 'btn-1': buttonItem });
    const { renderMessageComponent, received } = makeRenderSpy();

    render(
      <StoreProvider store={store}>
        <FooterButtonComponents
          message={makeParentItem(['btn-1'])}
          originalMessage={null as any}
          requestInputFocus={() => {}}
          disableUserInputs={false}
          isMessageForInput={true}
          scrollElementIntoView={() => {}}
          serviceManager={null as any}
          hideFeedback={false}
          showChainOfThought={false}
          allowNewFeedback={false}
          renderMessageComponent={renderMessageComponent}
        />
      </StoreProvider>
    );

    expect(received).toHaveLength(1);
    // The view object passed downstream should carry the standard-button variant.
    expect((received[0].item as any).is).toBe('standard-button');
    // But the original store object must stay untouched.
    expect((buttonItem.item as any).is).toBeUndefined();
    // And the view object must be a different reference from the store item.
    expect(received[0]).not.toBe(buttonItem);
    expect(received[0].item).not.toBe(buttonItem.item);
  });
});
