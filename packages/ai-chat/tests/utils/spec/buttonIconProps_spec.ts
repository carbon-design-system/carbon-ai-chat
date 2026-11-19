/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { getButtonIconProps } from '../../../src/chat/utils/buttonIconProps';
import { customIconToReact } from '../../../src/chat/utils/carbonIcon';

const CUSTOM_ICON = {
  elem: 'svg',
  attrs: { viewBox: '0 0 16 16' },
  content: [{ elem: 'path', attrs: { d: 'M0 0h16v16H0z' } }],
} as any;

const DefaultIcon = (): null => null;

describe('getButtonIconProps', () => {
  it('uses the default icon when the item has no icon', () => {
    expect(getButtonIconProps({} as any, DefaultIcon).renderIcon).toBe(
      DefaultIcon
    );
  });

  it('prefers the consumer icon over the default icon', () => {
    const { renderIcon } = getButtonIconProps(
      { icon: CUSTOM_ICON } as any,
      DefaultIcon
    );

    expect(renderIcon).toBe(customIconToReact(CUSTOM_ICON));
  });

  it('has no icon when there is neither a consumer icon nor a default', () => {
    expect(getButtonIconProps({} as any).renderIcon).toBeUndefined();
  });

  it('passes the label and alignment options through', () => {
    expect(
      getButtonIconProps({ hide_label: true, icon_alignment: 'start' } as any)
    ).toMatchObject({ hideLabel: true, iconAlignment: 'start' });
  });
});
