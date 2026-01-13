import React from "react";
import { BUTTON_KIND, BUTTON_TYPE, BUTTON_SIZE, BUTTON_TOOLTIP_ALIGNMENT, BUTTON_TOOLTIP_POSITION } from "@carbon/web-components/es-custom/components/button/defs.js";
import CarbonButtonElement from "@carbon/web-components/es-custom/components/button/button.js";
declare const Button: React.ForwardRefExoticComponent<Omit<Record<string, unknown>, "ref"> & React.RefAttributes<CarbonButtonElement>>;
export default Button;
export { BUTTON_KIND, BUTTON_TYPE, BUTTON_SIZE, BUTTON_TOOLTIP_ALIGNMENT, BUTTON_TOOLTIP_POSITION, };
