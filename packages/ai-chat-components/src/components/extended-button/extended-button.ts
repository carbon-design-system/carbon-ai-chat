/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { customElement } from "lit/decorators.js";
import extendedButton from "./src/extended-button.template.js";
import prefix from "../../globals/settings.js";

/**
 * Component extending the @carbon/web-components' button
 */
//@ts-ignore
@customElement(`${prefix}-extended-button`)
class ExtendedButton extends extendedButton {}

export default ExtendedButton;
