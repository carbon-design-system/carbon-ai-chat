/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This file contains a list of modules that we don't have TypeScript definitions for and we don't feel the need to
 * create any. Adding a module here basically tells TypeScript to treat the library as "any" and thus disables all
 * type checking when interacting with the module.
 */

declare module "@carbon/colors";
declare module "@carbon/themes";
declare module "@carbon/icons/es/*" {
  const icon: IconDescriptor;
  export default icon;
}

// These will let typescript recognizes image assets.
declare module "*.png";
declare module "*.jpg";
declare module "*.gif";
declare module "*.svg";
declare module "*.scss";
