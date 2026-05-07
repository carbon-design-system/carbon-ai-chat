/**
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";

const currentYear = new Date().getFullYear();
const licenseText = `Copyright IBM Corp\\.\\s+\\d{4}(?:,\\s*\\d{4})*.*This source code is licensed under the Apache-2\\.0 license found in the
.*LICENSE file in the root directory of this source tree.`;
const licenseTextCurrentYear = `Copyright IBM Corp\\.\\s+(?:\\d{4},\\s*)*${currentYear}(?:,\\s*\\d{4})*(?=\\s).*This source code is licensed under the Apache-2\\.0 license found in the
.*LICENSE file in the root directory of this source tree.`;
const licenseTextSingleYear = `Copyright IBM Corp\\.\\s+\\d{4}(?=\\s)(?!\\s*,)`;
const licenseTextRange = `(Copyright IBM Corp\\.\\s+(?:\\d{4},\\s*)+)\\d{4}(?=\\s)`;
const reLicenseText = new RegExp(licenseText, "s");
reLicenseText.currentYear = currentYear;
reLicenseText.reLicenseTextCurrentYear = new RegExp(
  licenseTextCurrentYear,
  "s",
);
reLicenseText.reLicenseTextSingleYear = new RegExp(licenseTextSingleYear, "s");
reLicenseText.reLicenseTextRange = new RegExp(licenseTextRange, "s");

module.exports = reLicenseText;
