/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  BoundaryException,
  FolderRule,
  SourceGraph,
  folderViolations,
  frameworkViolations,
  typeReferences,
} from '../helpers/sourceBoundaries';

const root = path.resolve(__dirname, '../../..');

/** Which folders each folder may import. #2706 adds a rule for `src/view/`. */
const rules: FolderRule[] = [
  {
    folder: 'src/shared/',
    mayImport: ['src/shared/', 'src/types/'],
    frameworkFree: true,
  },
  {
    folder: 'src/sdk/',
    mayImport: ['src/sdk/', 'src/shared/', 'src/types/'],
    frameworkFree: true,
  },
  {
    // Public types may name a shared type or read shared JSON data. Shared
    // code may import only shared and types, so this leads into view code
    // only through one of shared's listed exceptions.
    folder: 'src/types/',
    mayImport: [
      'src/types/',
      { folder: 'src/shared/', only: ['type', 'data'] },
    ],
  },
];

/**
 * Each known violation and the issue whose work removes it. The list only
 * shrinks: a new violation fails, and so does an entry that no longer applies.
 */
const folderExceptions: BoundaryException[] = [];

// Each root folder lists its own exceptions, so a path from a new folder fails
// even where another folder's path to the same edge is listed. The SDK's own
// types reach this edge through ChatSDKConfig -> ServiceDeskConfig.
const frameworkExceptions: BoundaryException[] = [
  'src/shared/',
  'src/sdk/',
].flatMap((folder) => [
  {
    folder,
    from: 'src/types/config/ServiceDeskConfig.ts',
    to: '../ai-chat-components/src/components/prompt-line/src/types.ts',
    owner: '#1732',
    reason: "FileUpload's module also types the autocomplete's React parts",
  },
]);

/** View objects and view handles that conversation services must not hold. */
const viewHandleTypes = new Set([
  'AriaAnnouncerFunctionType',
  'EventTarget',
  'ChatViewState',
  'Document',
  'Element',
  'HasRequestFocus',
  'HTMLDivElement',
  'HTMLElement',
  'HTMLInputElement',
  'InputFunctions',
  'MainWindowFunctions',
  'Node',
  'ShadowRoot',
  'ViewService',
  'WriteableElements',
  'Window',
]);

const viewHandleExceptions: Array<{
  reference: string;
  owner: string;
  reason: string;
}> = [];

/** View-owned classes that stay in `chat/services/`; conversation services go in `shared/`. */
const chatServices = [
  'CustomPanelInstance.ts',
  'CustomPanelManager.ts',
  'MessagePresentationAdapter.ts',
  'ThemeWatcherService.ts',
  'ViewService.ts',
  'ariaAnnouncer.ts',
  'attachChatView.ts',
  'autocompleteContent.ts',
  'chatViewState.ts',
  'createViewBindings.ts',
  'extensionHosts.ts',
  'humanAgentCallbacks.ts',
  'inputCallbacks.ts',
  'inputExtensions.ts',
  'launcherState.ts',
  'lightDomHosts.ts',
  'loadingCounters.ts',
  'windowOpenState.ts',
];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(file);
    }
    return /\.tsx?$/.test(file) ? [file] : [];
  });
}

const relative = (file: string) =>
  path.relative(root, file).replaceAll('\\', '/');
const files = sourceFiles(path.join(root, 'src')).map(relative);
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const keys = (list: BoundaryException[]) =>
  list
    .map(({ folder, from, to }) =>
      folder ? `${folder}: ${from} -> ${to}` : `${from} -> ${to}`
    )
    .sort();
const base = new SourceGraph(root);

function check(graph = base) {
  return {
    folders: [...folderViolations(graph, rules, files)].sort(),
    frameworks: [...frameworkViolations(graph, rules, files)].sort(),
  };
}

/** Checks the tree with one import line added to the top of `file`. */
function plant(file: string, line: string) {
  return check(base.fork({ [file]: `${line}\n${read(file)}` }));
}

const current = check();

it('builds the graph without unresolved or dynamic imports', () => {
  expect(base.issues).toEqual([]);
});

it('keeps each folder to the folders it may import', () => {
  expect(current.folders).toEqual(keys(folderExceptions));
});

it('keeps frameworks and element registration out of what shared and sdk code reach', () => {
  expect(current.frameworks).toEqual(keys(frameworkExceptions));
});

it('keeps view handles out of conversation services and the SDK', () => {
  const services = files.filter(
    (file) =>
      file.startsWith('src/shared/services/') || file.startsWith('src/sdk/')
  );
  expect([...typeReferences(read, services, viewHandleTypes)].sort()).toEqual(
    viewHandleExceptions.map(({ reference }) => reference).sort()
  );
});

// The whole store's type includes the view partition, so only chat/ and view/
// may name it. Conversation code sees ConversationState (#1831 O5, O6). The
// whole config reaches view code too, so conversation code reads
// ConversationConfig, which the shell's PublicConfig fills (D5).
it('keeps the view partition and the whole config out of conversation and SDK code', () => {
  const conversation = files.filter(
    (file) => file.startsWith('src/shared/') || file.startsWith('src/sdk/')
  );
  expect([
    ...typeReferences(
      read,
      conversation,
      new Set([
        'AppConfig',
        'AppState',
        'PublicConfig',
        'ViewPartitionState',
        'ViewPersistedState',
      ])
    ),
  ]).toEqual([]);
});

it('keeps conversation folders out of chat/', () => {
  for (const folder of ['store', 'events', 'schema', 'languages']) {
    expect(fs.existsSync(path.join(root, 'src/chat', folder))).toBe(false);
  }
  const services = fs
    .readdirSync(path.join(root, 'src/chat/services'), { withFileTypes: true })
    .map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name))
    .sort();
  expect(services).toEqual(chatServices);
});

describe('planted imports', () => {
  const shared = 'src/shared/services/NamespaceService.ts';

  it.each([
    ["import 'lit';", 'lit'],
    ["import type { ReactNode } from 'react';", 'react'],
    ["import 'react-dom';", 'react-dom'],
    [
      "import type { LitElement } from '@lit/reactive-element';",
      '@lit/reactive-element',
    ],
  ])('fails shared code that imports a framework: %s', (line, target) => {
    expect(plant(shared, line).frameworks).toContain(
      `src/shared/: ${shared} -> ${target}`
    );
  });

  it('fails shared code that loads an element-registering module, even as a type', () => {
    const result = plant(
      shared,
      "import type { CDSAIChatMarkdown } from '@carbon/ai-chat-components/es/components/markdown/index.js';"
    );
    expect(result.frameworks).toContain(
      `src/shared/: ${shared} -> ../ai-chat-components/src/components/markdown/index.ts`
    );
  });

  // These types once leaked view code into shared code (#1831, D5).
  it.each([
    [
      "import type { PublicConfig } from '../../types/config/PublicConfig';",
      'src/types/config/PublicConfig.ts',
      '../ai-chat-components/src/components/markdown/index.ts',
    ],
    [
      "import type { HeaderConfig } from '../../types/config/HeaderConfig';",
      'src/types/config/HeaderConfig.ts',
      '../ai-chat-components/src/react/toolbar.tsx',
    ],
    [
      "import type { InputConfig } from '../../types/config/InputConfig';",
      'src/types/config/InputConfig.ts',
      '../ai-chat-components/src/components/prompt-line/index.ts',
    ],
    [
      "import type { AppConfig } from '../../types/state/AppConfig';",
      'src/types/config/PublicConfig.ts',
      '../ai-chat-components/src/components/markdown/index.ts',
    ],
    [
      "import type { AppState } from '../../types/state/AppState';",
      'src/types/config/MarkdownConfig.ts',
      'react',
    ],
  ])(
    'fails shared code that reaches view code through a config type: %s',
    (line, from, to) => {
      expect(plant(shared, line).frameworks).toContain(
        `src/shared/: ${from} -> ${to}`
      );
    }
  );

  it('fails shared code that imports view state, even as a type', () => {
    const result = plant(
      shared,
      "import type { viewActions } from '../../view/state';"
    );
    expect(result.folders).toContain(`${shared} -> src/view/state/index.ts`);
  });

  it('fails shared code that imports chat/, even as a type', () => {
    const result = plant(
      shared,
      "import type { ChatShell } from '../../chat/components/shell/ChatShell';"
    );
    expect(result.folders).toContain(
      `${shared} -> src/chat/components/shell/ChatShell.ts`
    );
  });

  it('fails a public type that imports view code, even as a type', () => {
    const types = 'src/types/config/CornersType.ts';
    const result = plant(
      types,
      "import type { ChatShell } from '../../chat/components/shell/ChatShell';"
    );
    expect(result.folders).toContain(
      `${types} -> src/chat/components/shell/ChatShell.ts`
    );
  });

  it('fails a public type that loads shared code at runtime', () => {
    const types = 'src/types/config/CornersType.ts';
    const result = plant(types, "import '../../shared/utils/constants';");
    expect(result.folders).toContain(
      `${types} -> src/shared/utils/constants.ts`
    );
  });

  it('fails the SDK entry that reaches a framework or view code', () => {
    const sdk = 'src/sdk/index.ts';
    expect(plant(sdk, "import 'react-dom/client';").frameworks).toContain(
      `src/sdk/: ${sdk} -> react-dom/client`
    );
    expect(
      plant(sdk, "import type { AppShell } from '../chat/AppShell';").folders
    ).toContain(`${sdk} -> src/chat/AppShell.tsx`);
  });

  it.each([
    [
      "import 'use-sync-external-store/shim/index.js';",
      'use-sync-external-store/shim/index.js',
    ],
    [
      "import '@carbon/web-components/es/components/button/index.js';",
      '@carbon/web-components/es/components/button/index.js',
    ],
    ["const react = require('react');", 'react'],
    ['/// <reference types="react" />', 'react'],
  ])(
    'fails shared code that reaches a framework another way: %s',
    (line, target) => {
      expect(plant(shared, line).frameworks).toContain(
        `src/shared/: ${shared} -> ${target}`
      );
    }
  );

  it('fails the custom-prefix build of an element-registering module', () => {
    const result = plant(
      shared,
      "import '@carbon/ai-chat-components/es-custom/components/markdown/index.js';"
    );
    expect(result.frameworks).toContain(
      `src/shared/: ${shared} -> ../ai-chat-components/src/components/markdown/index.ts`
    );
  });

  it('fails a framework-free file that registers an element itself, even through an alias', () => {
    const result = plant(
      shared,
      "const registry = customElements;\nregistry.define('x-planted', class extends HTMLElement {});"
    );
    expect(result.frameworks).toContain(
      `src/shared/: ${shared} -> customElements`
    );
  });

  it('fails an import that leaves the package outside the components source', () => {
    const result = plant(
      shared,
      "import '../../../../ai-chat-components/package.json';"
    );
    expect(result.folders).toContain(
      `${shared} -> ../ai-chat-components/package.json`
    );
  });

  it('counts a parenthesized dynamic import as a runtime load', () => {
    const types = 'src/types/config/CornersType.ts';
    const result = plant(
      types,
      "export const load = () => import(('../../shared/utils/constants'));"
    );
    expect(result.folders).toContain(
      `${types} -> src/shared/utils/constants.ts`
    );
  });

  it('fails a framework that shared code reaches through a type', () => {
    const types = 'src/types/config/CornersType.ts';
    expect(
      plant(types, "import type { TemplateResult } from 'lit';").frameworks
    ).toContain(`src/shared/: ${types} -> lit`);
  });
});
