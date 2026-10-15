/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  activateOverflowMenuItem,
  suppressMenuItemSpaceScroll,
  stopMenuClickPropagation,
} from '../menu-item-activation.js';

describe('activateOverflowMenuItem', () => {
  let open: jest.Mock;

  beforeEach(() => {
    open = jest.fn();
    jest.spyOn(window, 'open').mockImplementation(open);
  });

  it('calls onClick for an item with no href', () => {
    const onClick = jest.fn();
    activateOverflowMenuItem({ text: 'Rename', onClick });

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();
  });

  it('navigates in the current tab when the item has no target', () => {
    activateOverflowMenuItem({ text: 'Docs', href: 'https://example.com' });

    expect(open).toHaveBeenCalledWith(
      'https://example.com',
      '_self',
      'noopener'
    );
  });

  it('severs the opener when the item opens a new tab', () => {
    activateOverflowMenuItem({
      text: 'Docs',
      href: 'https://example.com',
      target: '_blank',
    });

    // The anchor this replaced got `noopener` implicitly. `window.open` does
    // not, so the opened tab would otherwise hold a live handle on the chat.
    // Not `noreferrer`: the anchor sent a `Referer` and so must this.
    expect(open).toHaveBeenCalledWith(
      'https://example.com',
      '_blank',
      'noopener'
    );
  });

  it('runs both when an item carries href and onClick', () => {
    // The toolbar renders the same Action as a visible icon button that fires
    // both, so the overflow copy must not silently drop one.
    const onClick = jest.fn();
    activateOverflowMenuItem({
      text: 'Docs',
      href: 'https://example.com',
      onClick,
    });

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('does nothing for a disabled item', () => {
    const onClick = jest.fn();
    activateOverflowMenuItem({
      text: 'Delete',
      href: 'https://example.com',
      disabled: true,
      onClick,
    });

    expect(onClick).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });
});

describe('suppressMenuItemSpaceScroll', () => {
  it('prevents Space from scrolling without stopping event propagation', () => {
    const event = new KeyboardEvent('keydown', { key: ' ', cancelable: true });
    const stopPropagation = jest.spyOn(event, 'stopPropagation');
    suppressMenuItemSpaceScroll(event);
    expect(event.defaultPrevented).toBe(true);
    expect(stopPropagation).not.toHaveBeenCalled();
  });

  it('leaves other keys to Carbon', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      cancelable: true,
    });
    suppressMenuItemSpaceScroll(event);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('stopMenuClickPropagation', () => {
  it('keeps clicks inside the menu while allowing close requests to bubble', () => {
    const wrapper = document.createElement('div');
    const menu = document.createElement('div');
    const item = document.createElement('div');
    wrapper.append(menu);
    menu.append(item);
    menu.addEventListener('click', stopMenuClickPropagation);
    const click = jest.fn();
    const close = jest.fn();
    wrapper.addEventListener('click', click);
    wrapper.addEventListener('cds-menu-close-root-request', close);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    item.dispatchEvent(event);
    item.dispatchEvent(
      new CustomEvent('cds-menu-close-root-request', { bubbles: true })
    );
    expect(click).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(false);
  });
});
