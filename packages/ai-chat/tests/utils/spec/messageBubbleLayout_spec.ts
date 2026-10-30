/*
 *  Copyright IBM Corp. 2026, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { getBubbleLayout } from '../../../src/chat/utils/messageBubbleLayout';
import {
  MessageResponseTypes,
  type GenericItem,
} from '../../../src/types/messaging/Messages';

const item = (value: Record<string, unknown>) =>
  value as unknown as GenericItem;

const DEFAULT_LAYOUT = {
  fullWidth: false,
  widthCap: 'none',
  insetFooter: false,
};

describe('getBubbleLayout', () => {
  it('returns the default layout for a missing item', () => {
    expect(getBubbleLayout(undefined)).toEqual(DEFAULT_LAYOUT);
  });

  it('returns the default layout for a text item', () => {
    expect(
      getBubbleLayout(item({ response_type: MessageResponseTypes.TEXT }))
    ).toEqual(DEFAULT_LAYOUT);
  });

  it('renders a multi-item carousel full width', () => {
    const layout = getBubbleLayout(
      item({
        response_type: MessageResponseTypes.CAROUSEL,
        items: [{}, {}],
      })
    );

    expect(layout).toEqual({ ...DEFAULT_LAYOUT, fullWidth: true });
  });

  it('renders a single-item carousel at card width', () => {
    const layout = getBubbleLayout(
      item({
        response_type: MessageResponseTypes.CAROUSEL,
        items: [{}],
      })
    );

    expect(layout).toEqual(DEFAULT_LAYOUT);
  });

  it('renders conversational search full width with an inset footer', () => {
    const layout = getBubbleLayout(
      item({ response_type: MessageResponseTypes.CONVERSATIONAL_SEARCH })
    );

    expect(layout).toEqual({
      ...DEFAULT_LAYOUT,
      fullWidth: true,
      insetFooter: true,
    });
  });

  it('renders a user-defined item full width when full_width is true', () => {
    const layout = getBubbleLayout(
      item({
        response_type: MessageResponseTypes.USER_DEFINED,
        full_width: true,
      })
    );

    expect(layout).toEqual({ ...DEFAULT_LAYOUT, fullWidth: true });
  });

  it('renders a user-defined item in the inset column when full_width is missing', () => {
    const layout = getBubbleLayout(
      item({ response_type: MessageResponseTypes.USER_DEFINED })
    );

    expect(layout).toEqual(DEFAULT_LAYOUT);
  });

  it('renders a user-defined item in the inset column when full_width is false', () => {
    const layout = getBubbleLayout(
      item({
        response_type: MessageResponseTypes.USER_DEFINED,
        full_width: false,
      })
    );

    expect(layout).toEqual(DEFAULT_LAYOUT);
  });

  it('keeps an image narrower than the message column', () => {
    const layout = getBubbleLayout(
      item({ response_type: MessageResponseTypes.IMAGE })
    );

    expect(layout).toEqual({ ...DEFAULT_LAYOUT, widthCap: 'reduced' });
  });

  it('stretches a video across the message column', () => {
    const layout = getBubbleLayout(
      item({ response_type: MessageResponseTypes.VIDEO })
    );

    expect(layout).toEqual({ ...DEFAULT_LAYOUT, widthCap: 'fill' });
  });

  it('stretches audio across the message column', () => {
    const layout = getBubbleLayout(
      item({ response_type: MessageResponseTypes.AUDIO })
    );

    expect(layout).toEqual({ ...DEFAULT_LAYOUT, widthCap: 'fill' });
  });

  it('stretches an iframe across the message column and clips its overflow', () => {
    const layout = getBubbleLayout(
      item({ response_type: MessageResponseTypes.IFRAME })
    );

    expect(layout).toEqual({ ...DEFAULT_LAYOUT, widthCap: 'contain' });
  });
});
