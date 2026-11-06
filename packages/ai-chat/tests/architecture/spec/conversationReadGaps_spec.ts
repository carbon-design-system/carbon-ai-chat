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

/** The prebuilt interface. `src/view/` reacts to conversation state by design. */
const interfaceFolders = ['src/chat', 'src/react', 'src/web-components'];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(file);
    }
    return /\.tsx?$/.test(file) ? [file] : [];
  });
}

const files = interfaceFolders.flatMap((folder) =>
  sourceFiles(path.join(root, folder)).map((file) =>
    path.relative(root, file).replaceAll('\\', '/')
  )
);
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

/** Reads in the tree with `files` replaced, as `file: read`. */
function readsWith(replaced: Record<string, string> = {}) {
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
  const forked = ts.createProgram(
    [...new Set([...files, ...Object.keys(replaced)])].map((file) =>
      path.join(root, file)
    ),
    options,
    host,
    program
  );
  return conversationReads(forked, root, [
    ...new Set([...files, ...Object.keys(replaced)]),
  ]);
}

const listed = conversationReadGaps
  .map(({ file, read }) => `${file}: ${read}`)
  .sort();
const current = [...conversationReads(program, root, files)].sort();

it('lists every conversation read by the interface, and nothing else', () => {
  expect(current).toEqual(listed);
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
import type { ServiceManager } from '../../shared/services/ServiceManager';
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
      'a shared selector passed by reference',
      "import { selectIsInputToHumanAgent } from '../../shared/store/selectors';\nexport const read = [selectIsInputToHumanAgent];",
      'selectIsInputToHumanAgent()',
    ],
  ])('fails %s', (_name, line, read) => {
    expect([...readsWith({ [planted]: header + line })]).toContain(
      `${planted}: ${read}`
    );
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
