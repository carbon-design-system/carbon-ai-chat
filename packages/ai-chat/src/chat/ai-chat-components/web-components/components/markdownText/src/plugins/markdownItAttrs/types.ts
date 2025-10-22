/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { Token } from "markdown-it";

export interface MarkdownItAttrsOptions {
  leftDelimiter?: string;
  rightDelimiter?: string;
  allowedAttributes?: (string | RegExp)[];
}

export type AttributePair = [string, string];

export type DetectingStrRule = (str: string) => boolean;

export interface DetectingRule {
  shift?: number;
  position?: number;
  type?: string | DetectingStrRule;
  tag?: string | DetectingStrRule;
  children?: DetectingRule[] | ((arr: unknown[]) => boolean);
  content?: string | DetectingStrRule;
  markup?: string | DetectingStrRule;
  info?: string | DetectingStrRule;
  nesting?: number;
  level?: number;
  block?: boolean;
  hidden?: boolean;
  attrs?: AttributePair[];
  map?: [number, number][];
  meta?: unknown;
}

export interface CurlyAttrsPattern {
  name: string;
  tests: DetectingRule[];
  transform: (tokens: Token[], i: number, j?: number) => void;
}

export interface MatchedResult {
  match: boolean;
  j: number | null;
}
