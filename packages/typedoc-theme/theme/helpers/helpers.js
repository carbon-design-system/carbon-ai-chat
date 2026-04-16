/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import {
  DeclarationReflection,
  ProjectReflection,
  SignatureReflection,
} from "typedoc";

/**
 * Merge CSS class names while dropping falsy entries.
 */
export function classNames(names, extraCss) {
  const css = Object.keys(names)
    .filter((key) => names[key])
    .concat(extraCss || "")
    .join(" ")
    .trim()
    .replace(/\s+/g, " ");

  return css.length ? css : undefined;
}

/**
 * Determine whether the reflection declares type parameters.
 */
export function hasTypeParameters(reflection) {
  return (
    (reflection instanceof DeclarationReflection ||
      reflection instanceof SignatureReflection) &&
    reflection.typeParameters != null &&
    reflection.typeParameters.length > 0
  );
}

/**
 * Return the display name including version (if present).
 */
export function getDisplayName(reflection) {
  let version = "";

  if (
    (reflection instanceof DeclarationReflection ||
      reflection instanceof ProjectReflection) &&
    reflection.packageVersion
  ) {
    version = ` - v${reflection.packageVersion}`;
  }

  return `${reflection.name}${version}`;
}
