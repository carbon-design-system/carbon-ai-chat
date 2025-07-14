/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { CarbonTheme } from "../config/PublicConfig";

enum CarbonThemeClassNames {
  WHITE = "cds--white",
  G10 = "cds--g10",
  G90 = "cds--g90",
  G100 = "cds--g100",
}

enum ButtonKindEnum {
  PRIMARY = "primary",
  SECONDARY = "secondary",
  DANGER = "danger",
  GHOST = "ghost",
  DANGER_PRIMARY = "danger--primary",
  DANGER_GHOST = "danger--ghost",
  DANGER_TERTIARY = "danger--tertiary",
  TERTIARY = "tertiary",
}

enum ButtonSizeEnum {
  SMALL = "sm",
  MEDIUM = "md",
  LARGE = "lg",
  XLARGE = "xl",
  XXLARGE = "2xl",
}

export { CarbonTheme, CarbonThemeClassNames, ButtonKindEnum, ButtonSizeEnum };
