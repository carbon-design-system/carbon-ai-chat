/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { FunctionComponent } from 'react';
import { ButtonItem } from '../../types/messaging/Messages';
import { CarbonIconProps, customIconToReact } from './carbonIcon';

/**
 * The icon props every button type passes to `BaseButtonItemComponent`. The consumer's `icon` wins over the button
 * type's default icon.
 */
function getButtonIconProps(
  item: ButtonItem,
  defaultIcon?: FunctionComponent<CarbonIconProps>
) {
  return {
    renderIcon: customIconToReact(item.icon) || defaultIcon,
    hideLabel: item.hide_label,
    iconAlignment: item.icon_alignment,
  };
}

export { getButtonIconProps };
