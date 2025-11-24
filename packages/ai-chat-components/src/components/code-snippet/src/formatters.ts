/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

export type LineCountFormatter = ({ count }: { count: number }) => string;

export const defaultLineCountText: LineCountFormatter = ({ count }) =>
  `${count} lines`;
