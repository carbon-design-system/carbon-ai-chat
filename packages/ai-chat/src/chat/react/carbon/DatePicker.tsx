/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent } from "@lit/react";
import React from "react";

// Export the actual class for the component that will *directly* be wrapped with React.
import CarbonDatePickerElement from "@carbon/web-components/es/components/date-picker/date-picker.js";
import CarbonDatePickerInputElement from "@carbon/web-components/es/components/date-picker/date-picker-input.js";

const DatePicker = createComponent({
  tagName: "cds-date-picker",
  elementClass: CarbonDatePickerElement,
  react: React,
  events: {
    onChange: "cds-date-picker-changed",
  },
});

const DatePickerInput = createComponent({
  tagName: "cds-date-picker-input",
  elementClass: CarbonDatePickerInputElement,
  react: React,
});

export { DatePicker, DatePickerInput };

export default DatePicker;
