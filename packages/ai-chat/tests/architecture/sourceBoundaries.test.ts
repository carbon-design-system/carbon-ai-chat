/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { isTestPath } from './helpers/isTestPath';
import fs from 'node:fs';
import path from 'node:path';
import {
  BoundaryException,
  ContractRule,
  FolderRule,
  SourceGraph,
  contractViolations,
  folderViolations,
  frameworkViolations,
  typeReferences,
} from './helpers/sourceBoundaries';

const root = path.resolve(import.meta.dirname, '../..');

/** The SDK's engine folders, as opposed to its entry files. */
const engineFolders = [
  'src/sdk/events/',
  'src/sdk/schema/',
  'src/sdk/services/',
  'src/sdk/store/',
  'src/sdk/utils/',
];

/** Which folders each folder may import. */
const rules: FolderRule[] = [
  {
    folder: 'src/sdk/',
    mayImport: ['src/sdk/', 'src/types/'],
    frameworkFree: true,
    // SDK tests run headless, so they render nothing and drive no browser.
    testFrameworks: [/^@testing-library\//, /^vitest\/browser(\/|$)/],
  },
  {
    // Public types may name an engine type, read the engine's JSON data, or
    // read the language packs, but not the SDK's entry files. SDK code may
    // import only sdk and types, so this leads into view code only through
    // one of the SDK's listed exceptions.
    folder: 'src/types/',
    mayImport: [
      'src/types/',
      { folder: 'src/languages/', only: ['data' as const] },
      ...engineFolders.map((folder) => ({
        folder,
        only: ['type' as const, 'data' as const],
      })),
    ],
  },
];

/**
 * Contract tests and their helpers drive the package as a host does: through
 * the published entries, the public types and the test IDs (chunk 10 D4).
 */
const contractHelpers = [
  'src/chat/__tests__/helpers/contract/',
  'src/sdk/__tests__/helpers/publicContract.ts',
  'src/sdk/__tests__/helpers/lifecycleControl.ts',
];
const publicEntries = [
  'src/aiChatEntry.tsx',
  'src/serverEntry.ts',
  'src/sdk/index.ts',
  'src/web-components/cds-aichat-container/index.ts',
  'src/web-components/cds-aichat-custom-element/index.ts',
];
const publicSpecifiers = [
  '@carbon/ai-chat',
  '@carbon/ai-chat/es-custom',
  '@carbon/ai-chat/server',
  '@carbon/ai-chat/dist/es/web-components/cds-aichat-container/index.js',
  '@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js',
];
const isContractHelper = (file: string) =>
  contractHelpers.some((helper) => file.startsWith(helper));
const contractRule: ContractRule = {
  isContractFile: (file) =>
    /\.contract(?:\.browser)?\.test\.tsx?$/.test(file) ||
    isContractHelper(file),
  mayImport: (target, external) =>
    external
      ? !target.startsWith('@carbon/ai-chat/') ||
        publicSpecifiers.includes(target)
      : publicEntries.includes(target) ||
        isContractHelper(target) ||
        (!isTestPath(target) &&
          (target.startsWith('src/types/') ||
            target.startsWith('src/testing/'))),
};

/**
 * Each known violation and the issue whose work removes it. The list only
 * shrinks: a new violation fails, and so does an entry that no longer applies.
 */
const folderExceptions: BoundaryException[] = [];

// Each root folder lists its own exceptions, so a path from a new folder fails
// even where another folder's path to the same edge is listed. The
// ServiceDeskConfig entry (reaching the input's editor types through
// FileUpload) closed with #1732. The SDK's own types reach the remaining edge
// through the message types' ButtonItem.
const frameworkExceptions: BoundaryException[] = [
  {
    folder: 'src/sdk/',
    from: 'src/types/messaging/Messages.ts',
    to: 'react',
    owner: '#2901',
    reason: 'ButtonItem.icon accepts a React component, a 1.x public type',
  },
];

/** View objects and view handles that conversation services must not hold. */
const viewHandleTypes = new Set([
  'AriaAnnouncerFunctionType',
  'EventTarget',
  'ChatMountState',
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

/** View-owned classes that stay in `chat/services/`; conversation services go in `sdk/`. */
const chatServices = [
  'CustomPanelInstance.ts',
  'CustomPanelManager.ts',
  'MessagePresentationAdapter.ts',
  'ThemeWatcherService.ts',
  'ViewService.ts',
  'ariaAnnouncer.ts',
  'assistantInputCommands.ts',
  'attachChatView.ts',
  'autocompleteContent.ts',
  'chatMountState.ts',
  'createViewBindings.ts',
  'extensionHosts.ts',
  'fireUserEvent.ts',
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
const everyFile = sourceFiles(path.join(root, 'src')).map(relative);
/** Production source. The type-reference checks below read only these. */
const files = everyFile.filter((file) => !isTestPath(file));
/** Tests beside the code, held to their folder's import rules (D5). */
const testFiles = everyFile.filter((file) => isTestPath(file));
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const keys = (list: BoundaryException[]) =>
  list
    .map(({ folder, from, to }) =>
      folder ? `${folder}: ${from} -> ${to}` : `${from} -> ${to}`
    )
    .sort();
const base = new SourceGraph(root);

function check(graph = base) {
  const checked = [...files, ...testFiles];
  return {
    folders: [...folderViolations(graph, rules, checked)].sort(),
    frameworks: [...frameworkViolations(graph, rules, checked)].sort(),
    contracts: [...contractViolations(graph, contractRule, checked)].sort(),
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

it('keeps frameworks and element registration out of what sdk code reaches', () => {
  expect(current.frameworks).toEqual(keys(frameworkExceptions));
});

it('keeps contract tests to the public entries, types and test IDs', () => {
  expect(current.contracts).toEqual([]);
});

it('keeps view handles out of conversation services and the SDK', () => {
  const services = files.filter((file) => file.startsWith('src/sdk/'));
  expect([...typeReferences(read, services, viewHandleTypes)].sort()).toEqual(
    viewHandleExceptions.map(({ reference }) => reference).sort()
  );
});

// The whole store's type includes the view partition, so only the prebuilt
// chat may name it. Conversation code sees ConversationState (#1831 O5, O6).
// The whole config reaches view code too, so conversation code reads
// ConversationConfig, which the shell's PublicConfig fills (D5).
it('keeps the view partition and the whole config out of SDK code', () => {
  const conversation = files.filter((file) => file.startsWith('src/sdk/'));
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
    .filter((entry) => !isTestPath(entry.name))
    .map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name))
    .sort();
  expect(services).toEqual(chatServices);
});

describe('planted imports', () => {
  const sdkFile = 'src/sdk/services/NamespaceService.ts';

  it.each([
    ["import 'lit';", 'lit'],
    ["import type { ReactNode } from 'react';", 'react'],
    ["import 'react-dom';", 'react-dom'],
    [
      "import type { LitElement } from '@lit/reactive-element';",
      '@lit/reactive-element',
    ],
  ])('fails sdk code that imports a framework: %s', (line, target) => {
    expect(plant(sdkFile, line).frameworks).toContain(
      `src/sdk/: ${sdkFile} -> ${target}`
    );
  });

  it('fails sdk code that loads an element-registering module, even as a type', () => {
    const result = plant(
      sdkFile,
      "import type { CDSAIChatMarkdown } from '@carbon/ai-chat-components/es/components/markdown/index.js';"
    );
    expect(result.frameworks).toContain(
      `src/sdk/: ${sdkFile} -> ../ai-chat-components/src/components/markdown/index.ts`
    );
  });

  // These types once leaked view code into sdk code (#1831, D5).
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
    'fails sdk code that reaches view code through a config type: %s',
    (line, from, to) => {
      expect(plant(sdkFile, line).frameworks).toContain(
        `src/sdk/: ${from} -> ${to}`
      );
    }
  );

  it('fails sdk code that imports view state, even as a type', () => {
    const result = plant(
      sdkFile,
      "import type { viewActions } from '../../chat/state';"
    );
    expect(result.folders).toContain(`${sdkFile} -> src/chat/state/index.ts`);
  });

  it('fails sdk code that imports chat/, even as a type', () => {
    const result = plant(
      sdkFile,
      "import type { ChatShell } from '../../chat/components/shell/ChatShell';"
    );
    expect(result.folders).toContain(
      `${sdkFile} -> src/chat/components/shell/ChatShell.ts`
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

  it('fails a public type that loads sdk code at runtime', () => {
    const types = 'src/types/config/CornersType.ts';
    const result = plant(types, "import '../../sdk/utils/constants';");
    expect(result.folders).toContain(`${types} -> src/sdk/utils/constants.ts`);
  });

  it("fails a public type that imports the SDK's entry files, even as a type", () => {
    const types = 'src/types/config/CornersType.ts';
    const result = plant(
      types,
      "import type { chatOf } from '../../sdk/handle';"
    );
    expect(result.folders).toContain(`${types} -> src/sdk/handle.ts`);
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
    'fails sdk code that reaches a framework another way: %s',
    (line, target) => {
      expect(plant(sdkFile, line).frameworks).toContain(
        `src/sdk/: ${sdkFile} -> ${target}`
      );
    }
  );

  // FileUpload moved out of this module so conversation code stops reaching
  // the input's editor types (#1732 O19). The old path must still fail.
  it("fails sdk code that imports the input's full types module", () => {
    const result = plant(
      sdkFile,
      "import type { FileUpload } from '@carbon/ai-chat-components/es/components/prompt-line/src/types.js';"
    );
    expect(result.frameworks).toContain(
      `src/sdk/: ${sdkFile} -> ../ai-chat-components/src/components/prompt-line/src/types.ts`
    );
  });

  it('allows sdk code to import the file upload types module', () => {
    const result = plant(
      sdkFile,
      "import type { FileUpload } from '@carbon/ai-chat-components/es/components/prompt-line/src/file-upload-types.js';"
    );
    // The planted import adds no edge beyond the listed exceptions.
    expect(result.frameworks).toEqual(keys(frameworkExceptions));
  });

  it('fails the custom-prefix build of an element-registering module', () => {
    const result = plant(
      sdkFile,
      "import '@carbon/ai-chat-components/es-custom/components/markdown/index.js';"
    );
    expect(result.frameworks).toContain(
      `src/sdk/: ${sdkFile} -> ../ai-chat-components/src/components/markdown/index.ts`
    );
  });

  it('fails a framework-free file that registers an element itself, even through an alias', () => {
    const result = plant(
      sdkFile,
      "const registry = customElements;\nregistry.define('x-planted', class extends HTMLElement {});"
    );
    expect(result.frameworks).toContain(
      `src/sdk/: ${sdkFile} -> customElements`
    );
  });

  it('fails an import that leaves the package outside the components source', () => {
    const result = plant(
      sdkFile,
      "import '../../../../ai-chat-components/package.json';"
    );
    expect(result.folders).toContain(
      `${sdkFile} -> ../ai-chat-components/package.json`
    );
  });

  it('counts a parenthesized dynamic import as a runtime load', () => {
    const types = 'src/types/config/CornersType.ts';
    const result = plant(
      types,
      "export const load = () => import(('../../sdk/utils/constants'));"
    );
    expect(result.folders).toContain(`${types} -> src/sdk/utils/constants.ts`);
  });

  describe('in sdk tests', () => {
    const sdkTest = 'src/sdk/__tests__/registry.test.ts';

    it.each([
      ["import 'react';", 'react'],
      ["import '@testing-library/react';", '@testing-library/react'],
    ])('fails an sdk test that imports a framework: %s', (line, target) => {
      expect(plant(sdkTest, line).frameworks).toContain(
        `src/sdk/: ${sdkTest} -> ${target}`
      );
    });

    it.each([
      ["const actual = vi.importActual('react');", 'react'],
      ["vi.mock('@testing-library/react');", '@testing-library/react'],
      ["const actual = vitest.importActual('react');", 'react'],
      ["vi.mock(import('react'));", 'react'],
      [
        "import { act } from '@testing-library/react';\nvoid act;",
        '@testing-library/react',
      ],
    ])(
      'fails an sdk test that loads a framework at run time: %s',
      (line, target) => {
        expect(plant(sdkTest, line).frameworks).toContain(
          `src/sdk/: ${sdkTest} -> ${target}`
        );
      }
    );

    it('allows an sdk test a type-only framework import', () => {
      expect(
        plant(sdkTest, "import type { ReactNode } from 'react';").frameworks
      ).not.toContain(`src/sdk/: ${sdkTest} -> react`);
    });

    it('flags a vi module helper whose specifier is not a literal', () => {
      const graph = base.fork({
        [sdkTest]: `vi.mock(String('react'));\n${read(sdkTest)}`,
      });
      check(graph);
      expect(graph.issues).toContain(`${sdkTest}: nonliteral dynamic import`);
    });

    it('flags a require whose specifier is not a literal', () => {
      const graph = base.fork({
        [sdkTest]: `require(String('react'));\n${read(sdkTest)}`,
      });
      check(graph);
      expect(graph.issues).toContain(`${sdkTest}: nonliteral dynamic import`);
    });

    it('accepts the typed vi.mock(import()) form', () => {
      const graph = base.fork({
        [sdkTest]: `vi.mock(import('../registry'));\n${read(sdkTest)}`,
      });
      check(graph);
      expect(graph.issues).not.toContain(
        `${sdkTest}: nonliteral dynamic import`
      );
    });
  });

  it('fails a contract test that mocks an internal service', () => {
    const contract = 'src/sdk/__tests__/lifecycle.contract.test.ts';
    const result = plant(contract, "vi.mock('../services/ServiceManager');");
    expect(result.contracts).toContain(
      `${contract} -> src/sdk/services/ServiceManager.ts`
    );
  });

  it('fails a contract test that imports an internal service', () => {
    const contract = 'src/sdk/__tests__/lifecycle.contract.test.ts';
    const result = plant(
      contract,
      "import type { ServiceManager } from '../services/ServiceManager';"
    );
    expect(result.contracts).toContain(
      `${contract} -> src/sdk/services/ServiceManager.ts`
    );
  });

  it('fails a framework that sdk code reaches through a type', () => {
    const types = 'src/types/config/CornersType.ts';
    expect(
      plant(types, "import type { TemplateResult } from 'lit';").frameworks
    ).toContain(`src/sdk/: ${types} -> lit`);
  });
});
