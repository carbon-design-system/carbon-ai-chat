/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Presentational component for the Watch state (Redux Toolkit) example.
 *
 * Demonstrates: reading mirrored chat state with a narrow, typed selector.
 * This component never touches the `ChatInstance` — it only knows about the
 * Redux store. That decoupling is the integration's main payoff: any
 * component anywhere in the tree can react to chat state without prop
 * drilling or a bespoke context.
 *
 * APIs exercised:
 *   - `useAppSelector` (typed `useSelector`)
 *   - `selectIsHomeScreenOpen`
 *
 * Start reading at: the `useAppSelector` call below.
 */

import React from "react";

import { selectIsHomeScreenOpen, useAppSelector } from "./store";

function HomescreenStatus() {
  // useSelector with a narrow selector means this component only re-renders
  // when `homeScreenState.isHomeScreenOpen` actually flips, even though every
  // STATE_CHANGE dispatches a full snapshot replacement. react-redux's
  // reference-equality check on the selector return value handles the gating.
  const isHomescreenVisible = useAppSelector(selectIsHomeScreenOpen);

  return (
    <div>
      <h4>Current View State (via Redux selector):</h4>
      <p>{isHomescreenVisible ? "Homescreen" : "Chat View"}</p>
      <p>Watching state via STATE_CHANGE → Redux dispatch</p>
    </div>
  );
}

export { HomescreenStatus };
