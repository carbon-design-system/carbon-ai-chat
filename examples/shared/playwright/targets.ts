/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * The examples under test. Each key names a Playwright project, a Vite
 * server, and the URL variable that connects them.
 */

export interface Target {
  /** Example directory, relative to `examples/`. */
  example: string;
  /** Spec this target runs, relative to `tests/`. */
  spec: string;
}

export const targets = {
  'react-basic-custom-element-sidebar': {
    example: 'react/basic-custom-element-sidebar',
    spec: 'basic-custom-element-sidebar.spec.ts',
  },
  'react-basic-custom-element-sidebar-narrow': {
    example: 'react/basic-custom-element-sidebar-narrow',
    spec: 'basic-custom-element-sidebar-narrow.spec.ts',
  },
  'react-basic-float': {
    example: 'react/basic-float',
    spec: 'basic-float.spec.ts',
  },
  'react-chain-of-thought': {
    example: 'react/chain-of-thought',
    spec: 'chain-of-thought.spec.ts',
  },
  'react-custom-element-as-float': {
    example: 'react/custom-element-as-float',
    spec: 'custom-element-as-float.spec.ts',
  },
  'react-custom-element-as-float-lazy-load': {
    example: 'react/custom-element-as-float-lazy-load',
    spec: 'custom-element-as-float-lazy-load.spec.ts',
  },
  'react-custom-element-lazy-load': {
    example: 'react/custom-element-lazy-load',
    spec: 'custom-element-lazy-load.spec.ts',
  },
  'react-custom-header': {
    example: 'react/custom-header',
    spec: 'custom-header.spec.ts',
  },
  'react-feedback': {
    example: 'react/feedback',
    spec: 'feedback.spec.ts',
  },
  'react-fullscreen': {
    example: 'react/basic-custom-element-fullscreen',
    spec: 'fullscreen.spec.ts',
  },
  'react-history-file-attachments': {
    example: 'react/history-file-attachments',
    spec: 'history-file-attachments.spec.ts',
  },
  'react-history-float': {
    example: 'react/history-float',
    spec: 'history-float.spec.ts',
  },
  'react-history-fullscreen': {
    example: 'react/history-fullscreen',
    spec: 'history-fullscreen.spec.ts',
  },
  'react-history-host-driven': {
    example: 'react/history-host-driven',
    spec: 'history-host-driven.spec.ts',
  },
  'react-history-user-defined-responses': {
    example: 'react/history-user-defined-responses',
    spec: 'history-user-defined-responses.spec.ts',
  },
  'react-human-agent': {
    example: 'react/human-agent',
    spec: 'human-agent.spec.ts',
  },
  'react-markdown-override': {
    example: 'react/markdown-override',
    spec: 'markdown-override.spec.ts',
  },
  'react-markdown-plugin': {
    example: 'react/markdown-plugin',
    spec: 'markdown-plugin.spec.ts',
  },
  'react-mentions-and-commands': {
    example: 'react/prompt-line-mentions-and-commands',
    spec: 'mentions-and-commands.spec.ts',
  },
  'react-messages-custom-footer': {
    example: 'react/messages-custom-footer',
    spec: 'messages-custom-footer.spec.ts',
  },
  'react-messages-custom-request-footer': {
    example: 'react/messages-custom-request-footer',
    spec: 'messages-custom-request-footer.spec.ts',
  },
  'react-prompt-line-code-snippet': {
    example: 'react/prompt-line-code-snippet',
    spec: 'prompt-line-code-snippet.spec.ts',
  },
  'react-prompt-line-conversation-starters': {
    example: 'react/prompt-line-conversation-starters',
    spec: 'prompt-line-conversation-starters.spec.ts',
  },
  'react-prompt-line-custom-render': {
    example: 'react/prompt-line-custom-render',
    spec: 'prompt-line-custom-render.spec.ts',
  },
  'react-prompt-line-file-upload': {
    example: 'react/prompt-line-file-upload',
    spec: 'prompt-line-file-upload.spec.ts',
  },
  'react-prompt-line-history-mechanism': {
    example: 'react/prompt-line-history-mechanism',
    spec: 'prompt-line-history-mechanism.spec.ts',
  },
  'react-prompt-line-mentions-and-commands-custom-render': {
    example: 'react/prompt-line-mentions-and-commands-custom-render',
    spec: 'prompt-line-mentions-and-commands-custom-render-react.spec.ts',
  },
  'react-prompt-line-typeahead': {
    example: 'react/prompt-line-typeahead',
    spec: 'prompt-line-typeahead.spec.ts',
  },
  'react-prompt-line-typeahead-custom': {
    example: 'react/prompt-line-typeahead-custom',
    spec: 'prompt-line-typeahead-custom-react.spec.ts',
  },
  'react-reasoning-steps': {
    example: 'react/reasoning-steps',
    spec: 'reasoning-steps.spec.ts',
  },
  'react-reasoning-steps-controlled': {
    example: 'react/reasoning-steps-controlled',
    spec: 'reasoning-steps-controlled.spec.ts',
  },
  'react-reasoning-with-streaming-generic-items': {
    example: 'react/reasoning-with-streaming-generic-items',
    spec: 'reasoning-with-streaming-generic-items.spec.ts',
  },
  'react-tests-vitest-happydom': {
    example: 'react/tests-vitest-happydom',
    spec: 'tests-vitest-happydom.spec.ts',
  },
  'react-theme-plex-override': {
    example: 'react/theme-plex-override',
    spec: 'theme-plex-override.spec.ts',
  },
  'react-upsert-message-reasoning-steps': {
    example: 'react/upsert-message-reasoning-steps',
    spec: 'upsert-message-reasoning-steps.spec.ts',
  },
  'react-upsert-message-reasoning-steps-controlled': {
    example: 'react/upsert-message-reasoning-steps-controlled',
    spec: 'upsert-message-reasoning-steps-controlled.spec.ts',
  },
  'react-upsert-message-reasoning-with-streaming-generic-items': {
    example: 'react/upsert-message-reasoning-with-streaming-generic-items',
    spec: 'upsert-message-reasoning-with-streaming-generic-items.spec.ts',
  },
  'react-upsert-message-user-defined': {
    example: 'react/upsert-message-user-defined',
    spec: 'upsert-message-user-defined.spec.ts',
  },
  'react-user-defined-responses': {
    example: 'react/user-defined-responses',
    spec: 'user-defined-responses.spec.ts',
  },
  'react-watch-state': {
    example: 'react/watch-state',
    spec: 'watch-state.spec.ts',
  },
  'react-watch-state-redux': {
    example: 'react/watch-state-redux',
    spec: 'watch-state-redux.spec.ts',
  },
  'react-workspace': {
    example: 'react/workspace',
    spec: 'workspace.spec.ts',
  },
  'react-workspace-sidebar': {
    example: 'react/workspace-sidebar',
    spec: 'workspace-sidebar.spec.ts',
  },
  'react-workspace-table-markdown-override': {
    example: 'react/workspace-table-markdown-override',
    spec: 'workspace-table-markdown-override.spec.ts',
  },
  'web-components-basic-custom-element-sidebar': {
    example: 'web-components/basic-custom-element-sidebar',
    spec: 'basic-custom-element-sidebar.spec.ts',
  },
  'web-components-basic-custom-element-sidebar-narrow': {
    example: 'web-components/basic-custom-element-sidebar-narrow',
    spec: 'basic-custom-element-sidebar-narrow.spec.ts',
  },
  'web-components-basic-float': {
    example: 'web-components/basic-float',
    spec: 'basic-float.spec.ts',
  },
  'web-components-chain-of-thought': {
    example: 'web-components/chain-of-thought',
    spec: 'chain-of-thought.spec.ts',
  },
  'web-components-custom-element-as-float': {
    example: 'web-components/custom-element-as-float',
    spec: 'custom-element-as-float.spec.ts',
  },
  'web-components-custom-element-as-float-lazy-load': {
    example: 'web-components/custom-element-as-float-lazy-load',
    spec: 'custom-element-as-float-lazy-load.spec.ts',
  },
  'web-components-custom-element-lazy-load': {
    example: 'web-components/custom-element-lazy-load',
    spec: 'custom-element-lazy-load.spec.ts',
  },
  'web-components-custom-header': {
    example: 'web-components/custom-header',
    spec: 'custom-header.spec.ts',
  },
  'web-components-feedback': {
    example: 'web-components/feedback',
    spec: 'feedback.spec.ts',
  },
  'web-components-fullscreen': {
    example: 'web-components/basic-custom-element-fullscreen',
    spec: 'fullscreen.spec.ts',
  },
  'web-components-history-file-attachments': {
    example: 'web-components/history-file-attachments',
    spec: 'history-file-attachments.spec.ts',
  },
  'web-components-history-float': {
    example: 'web-components/history-float',
    spec: 'history-float.spec.ts',
  },
  'web-components-history-fullscreen': {
    example: 'web-components/history-fullscreen',
    spec: 'history-fullscreen.spec.ts',
  },
  'web-components-history-host-driven': {
    example: 'web-components/history-host-driven',
    spec: 'history-host-driven.spec.ts',
  },
  'web-components-history-user-defined-responses': {
    example: 'web-components/history-user-defined-responses',
    spec: 'history-user-defined-responses.spec.ts',
  },
  'web-components-human-agent': {
    example: 'web-components/human-agent',
    spec: 'human-agent.spec.ts',
  },
  'web-components-markdown-override': {
    example: 'web-components/markdown-override',
    spec: 'markdown-override.spec.ts',
  },
  'web-components-markdown-plugin': {
    example: 'web-components/markdown-plugin',
    spec: 'markdown-plugin.spec.ts',
  },
  'web-components-mentions-and-commands': {
    example: 'web-components/prompt-line-mentions-and-commands',
    spec: 'mentions-and-commands.spec.ts',
  },
  'web-components-messages-custom-footer': {
    example: 'web-components/messages-custom-footer',
    spec: 'messages-custom-footer.spec.ts',
  },
  'web-components-messages-custom-request-footer': {
    example: 'web-components/messages-custom-request-footer',
    spec: 'messages-custom-request-footer.spec.ts',
  },
  'web-components-prompt-line-code-snippet': {
    example: 'web-components/prompt-line-code-snippet',
    spec: 'prompt-line-code-snippet.spec.ts',
  },
  'web-components-prompt-line-conversation-starters': {
    example: 'web-components/prompt-line-conversation-starters',
    spec: 'prompt-line-conversation-starters.spec.ts',
  },
  'web-components-prompt-line-custom-render': {
    example: 'web-components/prompt-line-custom-render',
    spec: 'prompt-line-custom-render.spec.ts',
  },
  'web-components-prompt-line-file-upload': {
    example: 'web-components/prompt-line-file-upload',
    spec: 'prompt-line-file-upload.spec.ts',
  },
  'web-components-prompt-line-history-mechanism': {
    example: 'web-components/prompt-line-history-mechanism',
    spec: 'prompt-line-history-mechanism.spec.ts',
  },
  'web-components-prompt-line-mentions-and-commands-custom-render': {
    example: 'web-components/prompt-line-mentions-and-commands-custom-render',
    spec: 'prompt-line-mentions-and-commands-custom-render-web-components.spec.ts',
  },
  'web-components-prompt-line-typeahead': {
    example: 'web-components/prompt-line-typeahead',
    spec: 'prompt-line-typeahead.spec.ts',
  },
  'web-components-prompt-line-typeahead-custom': {
    example: 'web-components/prompt-line-typeahead-custom',
    spec: 'prompt-line-typeahead-custom-web-components.spec.ts',
  },
  'web-components-reasoning-steps': {
    example: 'web-components/reasoning-steps',
    spec: 'reasoning-steps.spec.ts',
  },
  'web-components-reasoning-steps-controlled': {
    example: 'web-components/reasoning-steps-controlled',
    spec: 'reasoning-steps-controlled.spec.ts',
  },
  'web-components-reasoning-with-streaming-generic-items': {
    example: 'web-components/reasoning-with-streaming-generic-items',
    spec: 'reasoning-with-streaming-generic-items.spec.ts',
  },
  'web-components-theme-plex-override': {
    example: 'web-components/theme-plex-override',
    spec: 'theme-plex-override.spec.ts',
  },
  'web-components-upsert-message-reasoning-steps': {
    example: 'web-components/upsert-message-reasoning-steps',
    spec: 'upsert-message-reasoning-steps.spec.ts',
  },
  'web-components-upsert-message-reasoning-steps-controlled': {
    example: 'web-components/upsert-message-reasoning-steps-controlled',
    spec: 'upsert-message-reasoning-steps-controlled.spec.ts',
  },
  'web-components-upsert-message-reasoning-with-streaming-generic-items': {
    example:
      'web-components/upsert-message-reasoning-with-streaming-generic-items',
    spec: 'upsert-message-reasoning-with-streaming-generic-items.spec.ts',
  },
  'web-components-upsert-message-user-defined': {
    example: 'web-components/upsert-message-user-defined',
    spec: 'upsert-message-user-defined.spec.ts',
  },
  'web-components-user-defined-responses': {
    example: 'web-components/user-defined-responses',
    spec: 'user-defined-responses.spec.ts',
  },
  'web-components-watch-state': {
    example: 'web-components/watch-state',
    spec: 'watch-state.spec.ts',
  },
  'web-components-workspace': {
    example: 'web-components/workspace',
    spec: 'workspace.spec.ts',
  },
  'web-components-workspace-sidebar': {
    example: 'web-components/workspace-sidebar',
    spec: 'workspace-sidebar.spec.ts',
  },
  'web-components-workspace-table-markdown-override': {
    example: 'web-components/workspace-table-markdown-override',
    spec: 'workspace-table-markdown-override.spec.ts',
  },
} as const satisfies Record<string, Target>;

export type TargetId = keyof typeof targets;

/** Name of the variable that carries a target server's captured URL. */
export function urlVariable(id: TargetId) {
  return `CAIC_E2E_URL_${id.toUpperCase().replaceAll('-', '_')}`;
}
