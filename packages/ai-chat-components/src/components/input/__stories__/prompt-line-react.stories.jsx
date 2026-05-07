/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useMemo, useRef } from "react";

import PromptLine from "../../../react/prompt-line.js";
import { carbonAutocomplete, carbonMention } from "../src/tiptap/index.js";

const USERS = [
  { id: "1", label: "Alice", value: "@alice" },
  { id: "2", label: "Bob", value: "@bob" },
  { id: "3", label: "Carol", value: "@carol" },
];

const SUGGESTIONS = [
  { id: "today", label: "today" },
  { id: "tomorrow", label: "tomorrow" },
];

export default {
  title: "Preview/Input/Prompt line (React wrapper)",
  component: PromptLine,
};

function EmptyStory() {
  return <PromptLine placeholder="Type here..." aria-label="empty" />;
}

function MentionStory() {
  const extensions = useMemo(
    () => [carbonMention({ trigger: "@", items: USERS })],
    [],
  );
  return (
    <PromptLine
      placeholder="Type @ to mention"
      aria-label="mention"
      extensions={extensions}
    />
  );
}

function ImperativeFocusStory() {
  const ref = useRef(null);
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          const editor = ref.current?.getEditor?.();
          editor?.commands.focus();
        }}
      >
        Focus prompt
      </button>
      <PromptLine
        ref={ref}
        placeholder="Imperative focus via ref + getEditor()"
        aria-label="imperative"
      />
    </div>
  );
}

function AutocompleteStory() {
  const extensions = useMemo(
    () => [carbonAutocomplete({ items: SUGGESTIONS })],
    [],
  );
  return (
    <PromptLine
      placeholder="Start typing"
      aria-label="autocomplete"
      extensions={extensions}
    />
  );
}

export const Empty = { render: () => <EmptyStory /> };
export const WithMention = { render: () => <MentionStory /> };
export const ImperativeFocus = { render: () => <ImperativeFocusStory /> };
export const WithAutocomplete = { render: () => <AutocompleteStory /> };
