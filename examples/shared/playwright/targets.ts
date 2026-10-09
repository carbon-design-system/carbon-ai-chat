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
  'react-fullscreen': {
    example: 'react/basic-custom-element-fullscreen',
    spec: 'fullscreen.spec.ts',
  },
  'react-mentions-and-commands': {
    example: 'react/prompt-line-mentions-and-commands',
    spec: 'mentions-and-commands.spec.ts',
  },
  'react-tests-vitest-happydom': {
    example: 'react/tests-vitest-happydom',
    spec: 'tests-vitest-happydom.spec.ts',
  },
  'react-theme-plex-override': {
    example: 'react/theme-plex-override',
    spec: 'theme-plex-override.spec.ts',
  },
  'react-watch-state': {
    example: 'react/watch-state',
    spec: 'watch-state.spec.ts',
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
  'web-components-fullscreen': {
    example: 'web-components/basic-custom-element-fullscreen',
    spec: 'fullscreen.spec.ts',
  },
  'web-components-mentions-and-commands': {
    example: 'web-components/prompt-line-mentions-and-commands',
    spec: 'mentions-and-commands.spec.ts',
  },
  'web-components-theme-plex-override': {
    example: 'web-components/theme-plex-override',
    spec: 'theme-plex-override.spec.ts',
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
