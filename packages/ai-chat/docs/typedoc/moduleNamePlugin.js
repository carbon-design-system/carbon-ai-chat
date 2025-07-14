/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { Converter } from "typedoc";

/** @type {import("typedoc").PluginHost} */
export function load(app) {
  app.converter.on(Converter.EVENT_RESOLVE_END, (context) => {
    const project = context.project;
    const mod = project.children.find((r) => r.name === "aiChatEntry");
    if (mod) {
      mod.name = "Type reference";
    }
  });
}
