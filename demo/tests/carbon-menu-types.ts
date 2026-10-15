/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { BaseOverflowMenuItem } from '@carbon/ai-chat-components/es/typings/overflow-menu.js';
import type { ToolbarAction, CustomMenuOption } from '@carbon/ai-chat';

const item: BaseOverflowMenuItem = {
  danger: true,
  dangerDescription: 'Deletes the item',
  disabled: false,
  divider: true,
  href: 'https://example.com',
  text: 'Open example',
  onClick: () => {},
  target: '_blank',
  testId: 'example-action',
  id: 'example',
};
const toolbarAction: ToolbarAction = {
  ...item,
  icon: () => null,
  fixed: true,
  isSelected: false,
};
const menuOption: CustomMenuOption = {
  text: item.text,
  href: item.href,
  target: item.target,
  disabled: item.disabled,
  testId: item.testId,
};

export { item, toolbarAction, menuOption };
