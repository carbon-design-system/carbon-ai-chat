/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { constructViewState } from "../../../src/chat/utils/viewStateUtils";
import { VIEW_STATE_ALL_CLOSED } from "../../../src/chat/store/reducerUtils";
import { ViewType } from "../../../src/types/state/AppState";

describe("viewStateUtils", () => {
  const baseState = {
    persistedToBrowserStorage: {
      viewState: {
        launcher: false,
        mainWindow: true,
      },
    },
  } as any;

  it("builds view state from string view type", () => {
    const result = constructViewState(ViewType.MAIN_WINDOW, baseState);
    expect(result).toEqual({ ...VIEW_STATE_ALL_CLOSED, mainWindow: true });
  });

  it("merges partial view state", () => {
    const result = constructViewState({ launcher: true }, baseState);
    expect(result.launcher).toBe(true);
    expect(result.mainWindow).toBe(true);
  });
});
