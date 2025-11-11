/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { create } from "storybook/theming";
import packageInfo from "../package.json";

const { description, version } = packageInfo;

export default create({
  base: "light",
  brandTitle: `${description} v${version}`,
  brandUrl: packageInfo.repository.url,
  fontBase: '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif',
  fontCode:
    '"IBM Plex Mono", Menlo, "DejaVu Sans Mono", "Bitstream Vera Sans Mono", Courier, monospace',
});
