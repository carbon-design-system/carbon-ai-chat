/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { white } from '@carbon/themes';
import { create } from 'storybook/theming';

export const docsTheme = create({
  base: 'light',
  textColor: white.textPrimary,
});
