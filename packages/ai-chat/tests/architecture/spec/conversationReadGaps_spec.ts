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
import ts from 'typescript';
import { conversationReads } from '../helpers/conversationReads';
import { conversationReadGaps } from '../conversationReadGaps';

const root = path.resolve(__dirname, '../../..');

/** The prebuilt interface. */
const interfaceFolders = ['src/chat', 'src/react', 'src/web-components'];

/** The view partition reacts to conversation state by design. */
const exemptFolders = ['src/chat/state/'];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(file);
    }
    return /\.tsx?$/.test(file) ? [file] : [];
  });
}

const files = interfaceFolders
  .flatMap((folder) =>
    sourceFiles(path.join(root, folder)).map((file) =>
      path.relative(root, file).replaceAll('\\', '/')
    )
  )
  .filter((file) => !exemptFolders.some((folder) => file.startsWith(folder)));
const { config } = ts.readConfigFile(
  path.join(root, 'tsconfig.json'),
  ts.sys.readFile
);
const options: ts.CompilerOptions = {
  ...ts.parseJsonConfigFileContent(config, ts.sys, root).options,
  noEmit: true,
};
const program = ts.createProgram(
  files.map((file) => path.join(root, file)),
  options
);

/** A compiler host that reads `replaced` in place of those files. */
function plantedHost(replaced: Record<string, string>) {
  const host = ts.createCompilerHost(options);
  const absolute = Object.fromEntries(
    Object.entries(replaced).map(([file, text]) => [
      path.join(root, file).replaceAll('\\', '/'),
      text,
    ])
  );
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (file, version, ...rest) =>
    file in absolute
      ? ts.createSourceFile(file, absolute[file], version, true)
      : getSourceFile(file, version, ...rest);
  return host;
}

/** Reads in the tree with `files` replaced, as `file: read`. */
function readsWith(replaced: Record<string, string> = {}) {
  const forked = ts.createProgram(
    [...new Set([...files, ...Object.keys(replaced)])].map((file) =>
      path.join(root, file)
    ),
    options,
    plantedHost(replaced),
    program
  );
  return [
    ...conversationReads(forked, root, [
      ...new Set([...files, ...Object.keys(replaced)]),
    ]).keys(),
  ];
}

const key = ({ file, read }: { file: string; read: string }) =>
  `${file}: ${read}`;
const listed = conversationReadGaps.map(key);
const counts = conversationReads(program, root, files);
const current = [...counts.keys()].sort();

it('lists every conversation read by the interface, and nothing else', () => {
  expect(current).toEqual([...listed].sort());
});

it('counts every occurrence of each listed read', () => {
  expect(
    Object.fromEntries(
      conversationReadGaps.map((gap) => [key(gap), counts.get(key(gap))])
    )
  ).toEqual(
    Object.fromEntries(conversationReadGaps.map((gap) => [key(gap), gap.count]))
  );
});

it('lists each read once, with an owner issue', () => {
  expect(new Set(listed).size).toBe(listed.length);
  conversationReadGaps.forEach(({ owner }) => expect(owner).toMatch(/^#\d+$/));
});

// #2693 O1: these reads come from instance.state now.
it('reads the agent connection from instance.state', () => {
  expect(
    current.filter((read) =>
      /persistedToBrowserStorage\.humanAgentState\b|humanAgentState\.isConnecting$/.test(
        read
      )
    )
  ).toEqual([]);
});

describe('planted reads', () => {
  const planted = 'src/chat/utils/plantedRead.ts';
  const header = `import type { AppState } from '../../types/state/AppState';
import type { ServiceManager } from '../../sdk/services/ServiceManager';
`;

  it.each([
    [
      'a field read from the store state',
      'export const read = (manager: ServiceManager) => manager.store.getState().allMessagesByID;',
      'allMessagesByID',
    ],
    [
      'a nested field path',
      'export const read = (state: AppState) => state.persistedToBrowserStorage.humanAgentState.isConnected;',
      'persistedToBrowserStorage.humanAgentState.isConnected',
    ],
    [
      'a destructured field',
      'export const read = (state: AppState) => { const { isHydrated } = state; return isHydrated; };',
      'isHydrated',
    ],
    [
      'an indexed field',
      "export const read = (state: AppState) => state['isHydrated'];",
      'isHydrated',
    ],
    [
      'a field indexed by a constant key',
      "const key = 'allMessagesByID';\nexport const read = (state: AppState) => state[key];",
      'allMessagesByID',
    ],
    [
      'a rest binding',
      'export const read = (state: AppState) => { const { view, ...rest } = state; return [view, rest]; };',
      'isRestarting',
    ],
    [
      'a helper that reads through the service manager',
      "import { captureMessageEvent } from '../../sdk/utils/messageEventOwnership';\nexport const read = [captureMessageEvent];",
      'captureMessageEvent()',
    ],
    [
      'a shared selector passed by reference',
      "import { selectIsInputToHumanAgent } from '../../sdk/store/selectors';\nexport const read = [selectIsInputToHumanAgent];",
      'selectIsInputToHumanAgent()',
    ],
  ])('fails %s', (_name, line, read) => {
    expect([...readsWith({ [planted]: header + line })]).toContain(
      `${planted}: ${read}`
    );
  });

  it('counts a second read through an alias', () => {
    const file = 'src/chat/utils/shellLifecycle.ts';
    const read = `${file}: persistedToBrowserStorage`;
    const reads = conversationReads(
      ts.createProgram(
        files.map((name) => path.join(root, name)),
        options,
        plantedHost({
          [file]:
            fs.readFileSync(path.join(root, file), 'utf8') +
            '\nexport const alias = (state: AppState) => { const saved = state.persistedToBrowserStorage; return saved.humanAgentState.isConnected; };\n',
        }),
        program
      ),
      root,
      files
    );
    expect(reads.get(read)).toBe(counts.get(read) + 1);
  });

  it('passes building the SDK instance, whose verbs read for it', () => {
    const reads = readsWith({
      [planted]:
        header +
        "import { createConversationInstance } from '../../sdk/services/conversationInstance';\nexport const build = (manager: ServiceManager) => createConversationInstance(manager, () => undefined);",
    });
    expect([...reads].filter((read) => read.startsWith(planted))).toEqual([]);
  });

  it("fails another reader in the SDK instance builder's file", () => {
    const builder = 'src/sdk/services/conversationInstance.ts';
    const reads = readsWith({
      [builder]:
        fs.readFileSync(path.join(root, builder), 'utf8') +
        '\nexport const isSendBlocked = (manager: ServiceManager) => selectInputIsReadonly(manager.store.getState());\n',
      [planted]:
        header +
        "import { isSendBlocked } from '../../sdk/services/conversationInstance';\nexport const read = [isSendBlocked];",
    });
    expect([...reads]).toContain(`${planted}: isSendBlocked()`);
  });

  it('passes view state and config reads', () => {
    const reads = readsWith({
      [planted]:
        header +
        'export const read = (state: AppState) => [state.view.persistedToBrowserStorage, state.config.public, state.languagePack];',
    });
    expect([...reads].filter((read) => read.startsWith(planted))).toEqual([]);
  });
});
