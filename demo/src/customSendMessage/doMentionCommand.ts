/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ChatInstance,
  MessageRequest,
  MessageResponseTypes,
  SuggestionItem,
} from "@carbon/ai-chat";

/**
 * Mock `InputConfig.mention` / `InputConfig.command` fixtures and callbacks
 * for the demo.
 *
 * Mirrors `examples/*\/prompt-line-mentions-and-commands`: the `onSelect`/`onRemove`
 * pair keeps the message's structured-data sidecar in sync with the editor
 * via `instance.input.updateStructuredData`, and `doMentionCommandResponse`
 * echoes any `mention`/`command` fields back as a text message.
 */

const mentionItems: SuggestionItem[] = [
  { id: "u1", label: "Jane Smith", description: "Design Lead" },
  { id: "u2", label: "Bob Chen", description: "Frontend Engineer" },
  { id: "u3", label: "Alice Park", description: "Product Manager" },
  { id: "u4", label: "Carlos Rivera", description: "Backend Engineer" },
  { id: "u5", label: "Dana Williams", description: "QA Engineer" },
];

const commandItems: SuggestionItem[] = [
  {
    id: "summarize",
    label: "summarize",
    description: "Summarize the conversation",
  },
  {
    id: "translate",
    label: "translate",
    description: "Translate to another language",
  },
  { id: "clear", label: "clear", description: "Clear the conversation" },
  { id: "help", label: "help", description: "Show available commands" },
];

function mentionOnSelect(item: SuggestionItem): void {
  window.chatInstance?.input.updateStructuredData((prev) => ({
    ...prev,
    fields: [
      ...(prev?.fields ?? []),
      {
        id: `mention_${item.id}`,
        label: item.label,
        type: "mention",
        value: item.id,
      },
    ],
  }));
}

// Symmetric cleanup: when the user deletes a mention chip before sending,
// drop the matching sidecar field so it does not leak into structured_data.
// Match the same `mention_`-prefixed id used on insert, remove one instance
// so duplicates stay balanced, and return prev untouched when nothing matched.
function mentionOnRemove(item: SuggestionItem): void {
  window.chatInstance?.input.updateStructuredData((prev) => {
    if (!prev?.fields) {
      return prev;
    }
    const index = prev.fields.findIndex(
      (field) => field.type === "mention" && field.id === `mention_${item.id}`,
    );
    if (index === -1) {
      return prev;
    }
    const fields = [...prev.fields];
    fields.splice(index, 1);
    return { ...prev, fields };
  });
}

function commandOnSelect(item: SuggestionItem): void {
  window.chatInstance?.input.updateStructuredData((prev) => ({
    ...prev,
    fields: [
      ...(prev?.fields ?? []),
      {
        id: `command_${item.id}`,
        label: item.label,
        type: "command",
        value: item.id,
      },
    ],
  }));
}

// Mirror the mention cleanup so a deleted command chip also leaves
// structured_data, matching the `command_`-prefixed id and removing a single
// field.
function commandOnRemove(item: SuggestionItem): void {
  window.chatInstance?.input.updateStructuredData((prev) => {
    if (!prev?.fields) {
      return prev;
    }
    const index = prev.fields.findIndex(
      (field) => field.type === "command" && field.id === `command_${item.id}`,
    );
    if (index === -1) {
      return prev;
    }
    const fields = [...prev.fields];
    fields.splice(index, 1);
    return { ...prev, fields };
  });
}

/**
 * Mock server response handler for messages that carry `mention`/`command`
 * structured-data fields. Echoes what was attached as a text message before
 * the standard response for the utterance is shown.
 */
function doMentionCommandResponse(
  request: MessageRequest,
  instance: ChatInstance,
): void {
  const fields = request.input.structured_data?.fields ?? [];
  const mentions = fields.filter((f) => f.type === "mention");
  const commands = fields.filter((f) => f.type === "command");

  if (mentions.length === 0 && commands.length === 0) {
    return;
  }

  const parts: string[] = [];

  if (mentions.length > 0) {
    const names = mentions.map((m) => m.label).join(", ");
    parts.push(`**Mentions:** ${names}`);
  }

  if (commands.length > 0) {
    const cmds = commands.map((c) => `/${c.label}`).join(", ");
    parts.push(`**Commands:** ${cmds}`);
  }

  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: parts.join("\n\n"),
        },
      ],
    },
  });
}

export {
  mentionItems,
  commandItems,
  mentionOnSelect,
  mentionOnRemove,
  commandOnSelect,
  commandOnRemove,
  doMentionCommandResponse,
};
