/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent } from '@lit/react';
import React from 'react';

import {
  CDSDropdown as CarbonDropdownElement,
  CDSDropdownItem as CarbonDropdownItemElement,
} from '@carbon/web-components/es/components/dropdown/index.js';

const Dropdown = createComponent({
  tagName: 'cds-dropdown',
  elementClass: CarbonDropdownElement,
  events: {
    onSelected: 'cds-dropdown-selected',
    onToggled: 'cds-dropdown-toggled',
  },
  react: React,
});

const DropdownItem = createComponent({
  tagName: 'cds-dropdown-item',
  elementClass: CarbonDropdownItemElement,
  react: React,
});

export { Dropdown, DropdownItem };
