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
const folderExceptions: BoundaryException[] = [
  {
    from: 'src/shared/services/InputActionsService.ts',
    to: 'src/chat/utils/customPromptLine.ts',
    owner: '#2694',
    reason: 'asks the view whether a custom prompt line replaces the input',
  },
  {
    from: 'src/shared/services/ServiceManager.ts',
    to: 'src/chat/services/ariaAnnouncer.ts',
    owner: '#2694',
    reason: 'holds the shell announcer',
  },
  {
    from: 'src/shared/services/ServiceManager.ts',
    to: 'src/chat/utils/inputTypes.ts',
    owner: '#2694',
    reason: 'holds two input handles',
  },
];

// Each root folder lists its own exceptions, so a path from a new folder fails
// even where another folder's path to the same edge is listed. The SDK's own
// types reach these edges: ChatSDKInstance -> eventBusTypes -> PublicChatState
// -> AppState -> AppConfig -> PublicConfig, and ChatSDKConfig -> ServiceDeskConfig.
const frameworkExceptions: BoundaryException[] = [
  'src/shared/',
  'src/sdk/',
].flatMap((folder) => [
  {
    folder,
    from: 'src/types/config/HeaderConfig.ts',
    to: '../ai-chat-components/src/react/toolbar.tsx',
    owner: '#1831',
    reason: 'shared state holds PublicConfig until it takes ChatSDKConfig',
  },
  {
    folder,
    from: 'src/types/config/InputConfig.ts',
    to: '../ai-chat-components/src/components/prompt-line/index.ts',
    owner: '#1831',
    reason: 'shared state holds PublicConfig until it takes ChatSDKConfig',
  },
  {
    folder,
    from: 'src/types/config/MarkdownConfig.ts',
    to: '../ai-chat-components/src/components/markdown/index.ts',
    owner: '#1831',
    reason: 'markdownConfig moves to the view partition',
  },
  {
    folder,
    from: 'src/types/config/MarkdownConfig.ts',
    to: 'react',
    owner: '#1831',
    reason: 'markdownConfig moves to the view partition',
  },
  {
    folder,
    from: 'src/types/config/PublicConfig.ts',
    to: '../ai-chat-components/src/components/markdown/index.ts',
    owner: '#1831',
    reason: 'shared state holds PublicConfig until it takes ChatSDKConfig',
  },
  {
    folder,
    from: 'src/types/config/ServiceDeskConfig.ts',
    to: '../ai-chat-components/src/components/prompt-line/src/types.ts',
    owner: '#1732',
    reason: "FileUpload's module also types the autocomplete's React parts",
  },
  {
    folder,
    from: 'src/types/messaging/Messages.ts',
    to: 'react',
    owner: '#2901',
    reason: 'ButtonItem.icon accepts a React component, a 1.x public type',
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
}> = [
  {
    reference:
      'src/shared/services/ServiceManager.ts: AriaAnnouncerFunctionType',
    owner: '#2694',
    reason: 'the shell announcer',
  },
  {
    reference: 'src/shared/services/ServiceManager.ts: HasRequestFocus',
    owner: '#2694',
    reason: 'appWindow',
  },
  {
    reference: 'src/shared/services/ServiceManager.ts: InputFunctions',
    owner: '#2694',
    reason: 'the two input handles',
  },
  {
    reference: 'src/shared/services/ServiceManager.ts: MainWindowFunctions',
    owner: '#2694',
    reason: 'mainWindow',
  },
  {
    reference: 'src/shared/services/ServiceManager.ts: HTMLElement',
    owner: '#1732',
    reason: 'container and customHostElement move to the view attach',
  },
  {
    reference: 'src/shared/services/ServiceManager.ts: WriteableElements',
    owner: '#1732',
    reason: 'writeable elements move to the view attach',
  },
  {
    reference: 'src/shared/services/ThemeWatcherService.ts: Element',
    owner: '#1681',
    reason: 'the theme watcher reads CSS variables from the container',
  },
  {
    reference: 'src/shared/services/ThemeWatcherService.ts: HTMLElement',
    owner: '#1681',
    reason: 'the theme watcher reads CSS variables from the container',
  },
  {
    reference: 'src/shared/services/ThemeWatcherService.ts: ShadowRoot',
    owner: '#1681',
    reason: 'the theme watcher reads CSS variables from the container',
  },
];

/** View-owned classes that stay in `chat/services/`; conversation services go in `shared/`. */
const chatServices = [
  'MessagePresentationAdapter.ts',
  'ViewService.ts',
  'ariaAnnouncer.ts',
  'autocompleteContent.ts',
  'chatViewState.ts',
  'createViewBindings.ts',
  'extensionHosts.ts',
  'humanAgentCallbacks.ts',
  'inputExtensions.ts',
  'launcherState.ts',
  'lightDomHosts.ts',
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
