/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

interface PanelBodyContentDetail {
  target: HTMLElement;
  text: string;
}

type PanelBodyContentReadyEvent = CustomEvent<PanelBodyContentDetail | null>;

export type { PanelBodyContentDetail, PanelBodyContentReadyEvent };
