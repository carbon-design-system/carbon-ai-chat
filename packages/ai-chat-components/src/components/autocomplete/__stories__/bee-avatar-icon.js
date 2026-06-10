/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import { html } from "lit";
import Bee16 from "@carbon/icons/es/bee/16.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";

/**
 * Creates a bee icon wrapped in a styled avatar circle for Storybook examples.
 * This is example-specific styling and not part of the core component library.
 */
export const BeeAvatarIcon = html`
  <div
    style="display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%; background: var(--cds-layer-hover-01);"
  >
    <div style="width: 16px; height: 16px;">${iconLoader(Bee16)}</div>
  </div>
`;
