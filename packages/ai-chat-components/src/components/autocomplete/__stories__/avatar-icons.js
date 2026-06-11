/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import { html } from "lit";
import Book16 from "@carbon/icons/es/book/16.js";
import ChartLine16 from "@carbon/icons/es/chart--line/16.js";
import Database16 from "@carbon/icons/es/data--base/16.js";
import Help16 from "@carbon/icons/es/help/16.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";

/**
 * Creates an icon wrapped in a styled avatar circle for Storybook examples.
 * This is example-specific styling and not part of the core component library.
 */
const createAvatarIcon = (icon) => html`
  <div
    style="display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%; background: var(--cds-layer-hover-01);"
  >
    <div style="width: 16px; height: 16px;">${iconLoader(icon)}</div>
  </div>
`;

export const BookAvatarIcon = createAvatarIcon(Book16);
export const ChartLineAvatarIcon = createAvatarIcon(ChartLine16);
export const DatabaseAvatarIcon = createAvatarIcon(Database16);
export const HelpAvatarIcon = createAvatarIcon(Help16);
