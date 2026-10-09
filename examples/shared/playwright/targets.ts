/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * The golden examples under test. Each key names a Playwright project, a Vite
 * server, and the URL variable that connects them.
 */

export interface Target {
  /** Example directory, relative to `examples/`. */
  example: string;
  /** Spec this target runs, relative to `tests/`. */
  spec: string;
}

export const targets = {
  'react-fullscreen': {
    example: 'react/basic-custom-element-fullscreen',
    spec: 'fullscreen.spec.ts',
  },
  'react-mentions-and-commands': {
    example: 'react/prompt-line-mentions-and-commands',
    spec: 'mentions-and-commands.spec.ts',
  },
  'react-watch-messages': {
    example: 'react/watch-messages',
    spec: 'watch-messages.spec.ts',
  },
  'react-watch-messages-redux': {
    example: 'react/watch-messages-redux',
    spec: 'watch-messages.spec.ts',
  },
  'react-watch-state': {
    example: 'react/watch-state',
    spec: 'watch-state.spec.ts',
  },
  'react-watch-state-redux': {
    example: 'react/watch-state-redux',
    spec: 'watch-state.spec.ts',
  },
  'web-components-fullscreen': {
    example: 'web-components/basic-custom-element-fullscreen',
    spec: 'fullscreen.spec.ts',
  },
  'web-components-mentions-and-commands': {
    example: 'web-components/prompt-line-mentions-and-commands',
    spec: 'mentions-and-commands.spec.ts',
  },
  'web-components-watch-state': {
    example: 'web-components/watch-state',
    spec: 'watch-state.spec.ts',
  },
} as const satisfies Record<string, Target>;

export type TargetId = keyof typeof targets;

/** Name of the variable that carries a target server's captured URL. */
export function urlVariable(id: TargetId) {
  return `CAIC_E2E_URL_${id.toUpperCase().replaceAll('-', '_')}`;
}
