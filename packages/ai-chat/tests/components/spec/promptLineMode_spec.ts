/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { resolvePromptLineMode } from "../../../src/chat/components/input/promptLineMode";
import type { InputConfig } from "../../../src/types/config/InputConfig";

describe("resolvePromptLineMode", () => {
  it("defaults to lite when no input config is provided", () => {
    expect(resolvePromptLineMode(undefined)).toBe("lite");
    expect(resolvePromptLineMode({})).toBe("lite");
  });

  it("stays lite for a plain text input config", () => {
    const input: InputConfig = { maxInputCharacters: 1000, isVisible: true };
    expect(resolvePromptLineMode(input)).toBe("lite");
  });

  it("derives rich when a trigger-driven feature is configured", () => {
    expect(
      resolvePromptLineMode({ mention: { trigger: "@", items: [] } }),
    ).toBe("rich");
    expect(
      resolvePromptLineMode({ command: { trigger: "/", items: [] } }),
    ).toBe("rich");
    expect(resolvePromptLineMode({ autocomplete: { items: [] } })).toBe("rich");
    expect(resolvePromptLineMode({ starters: [{ id: "a", label: "A" }] })).toBe(
      "rich",
    );
  });

  it("derives rich for host tiptap.extensions — they may add typing-driven behavior", () => {
    expect(
      resolvePromptLineMode({ tiptap: { extensions: [{} as never] } }),
    ).toBe("rich");
  });

  it("treats empty advanced collections as lite", () => {
    expect(resolvePromptLineMode({ starters: [] })).toBe("lite");
    expect(resolvePromptLineMode({ tiptap: { extensions: [] } })).toBe("lite");
    expect(resolvePromptLineMode({ tiptap: {} })).toBe("lite");
  });
});
