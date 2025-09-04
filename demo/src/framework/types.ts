/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

interface Settings {
  framework: "react" | "web-component";
  layout: "float" | "sidebar" | "fullscreen" | "fullscreen-no-gutter";
  writeableElements: "true" | "false";
}

interface KeyPairs {
  key: string;
  value: string;
}

export { KeyPairs, Settings };
