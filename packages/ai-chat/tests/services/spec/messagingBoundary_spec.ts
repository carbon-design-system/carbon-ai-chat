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
import {
  sourceFiles,
  sourceProgram,
  runtimeGraph,
  resolveSource,
  visit,
  capabilityIssues,
} from '../helpers/messagingBoundary';

const root = path.resolve(__dirname, '../../..');
const messaging = 'src/chat/services/messaging/';
const pureRoots = [
  'outbound/OutgoingMessageService.ts',
  'inbound/IncomingMessageService.ts',
  'state/ConversationState.ts',
  'state/RequestQueue.ts',
  'state/StreamState.ts',
  'state/IncomingWriteState.ts',
].map((name) => messaging + name);
const workflows = [
  'MessageCoordinator.ts',
  'SendWorkflow.ts',
  'TerminationWorkflow.ts',
  'FullResponseWorkflow.ts',
  'UpsertWorkflow.ts',
  'ChunkWorkflow.ts',
  'HistoryWorkflow.ts',
  'IncomingWriteLifetime.ts',
  'OutboundMessageCoordinator.ts',
  'InboundStreamingCoordinator.ts',
  'HeadlessReasoningObserver.ts',
  'coordinateSend.ts',
  'coordinateMessageEvents.ts',
  'coordinateReasoningEvents.ts',
].map((name) => messaging + name);
const pureOutside = new Set([
  'src/chat/schema/inputItemData.ts',
  'src/chat/schema/outputItemData.ts',
  'src/types/config/MessagingConfig.ts',
]);
const externalData = new Set(['lodash-es/cloneDeep.js', 'lodash-es/merge.js']);
const coreExternal = new Set([
  ...externalData,
  'lodash-es/isEqual.js',
  'lodash-es/cloneDeepWith.js',
  // Runtime public message enums; this exact definitions module does not register a component.
  '@carbon/web-components/es/components/button/defs.js',
]);
const graph = (roots: string[], external: Set<string>) =>
  runtimeGraph(
    roots.map((f) => path.join(root, f)),
    (f) => fs.readFileSync(f, 'utf8'),
    (f, s) => resolveSource(f, s, root),
    external
  );
const coreRuntime = graph([messaging + 'MessageCoordinator.ts'], coreExternal);
const allFiles = sourceFiles(path.join(root, 'src'));
const { program, checker } = sourceProgram([
  ...new Set([...allFiles, ...coreRuntime.files]),
]);
const relative = (file: string) =>
  path.relative(root, file).replaceAll('\\', '/');
const get = (file: string) => {
  const source = program.getSourceFile(path.join(root, file));
  if (!source) {
    throw new Error(`Missing boundary source ${file}`);
  }
  return source;
};

// Accepted data symbols, not their whole source modules. Host payload values remain opaque.
const dataDeclarations: Record<string, string[]> = {
  'src/types/messaging/Messages.ts': [
    'Message',
    'MessageRequest',
    'MessageResponse',
    'GenericItem',
    'MessageInput',
    'StructuredData',
    'MessageResponseHistory',
    'MessageRequestHistory',
    'PartialResponse',
    'PartialOrCompleteItemChunk',
    'PartialItemChunk',
    'StreamChunk',
    'PauseItem',
  ],
  'src/types/messaging/LocalMessageItem.ts': [
    'LocalMessageItem',
    'LocalMessageUIState',
  ],
  'src/types/instance/PublicChatState.ts': ['ConversationStatus'],
};
const leaves = new Set<ts.Symbol>();
for (const [file, names] of Object.entries(dataDeclarations)) {
  visit(get(file), (node) => {
    if (
      (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) &&
      names.includes(node.name.text)
    ) {
      const symbol = checker.getSymbolAtLocation(node.name);
      if (symbol) {
        leaves.add(symbol);
      }
      const type = checker.getTypeAtLocation(node);
      if (type.isUnion()) {
        for (const member of type.types) {
          if (member.symbol) {
            leaves.add(member.symbol);
          }
          if (member.aliasSymbol) {
            leaves.add(member.aliasSymbol);
          }
        }
      }
    }
  });
}

it('keeps all processor and state runtime dependencies pure', () => {
  const result = graph(pureRoots, externalData);
  expect(result.issues).toEqual([]);
  const forbidden = [...result.files]
    .map(relative)
    .filter(
      (file) =>
        !pureOutside.has(file) &&
        !file.startsWith(messaging + 'inbound/prepare') &&
        !pureRoots.includes(file)
    );
  expect(forbidden).toEqual([]);
  for (const folder of ['inbound', 'outbound', 'state']) {
    for (const file of sourceFiles(path.join(root, messaging, folder))) {
      expect(result.files.has(file)).toBe(true);
    }
  }
  for (const file of result.files) {
    const source = program.getSourceFile(file)!;
    if (relative(file) !== 'src/types/config/MessagingConfig.ts') {
      expect(capabilityIssues(checker, source, leaves)).toEqual([]);
    }
  }
});

it('keeps core runtime imports independent of the view', () => {
  const result = coreRuntime;
  expect(result.issues).toEqual([]);
  expect(
    [...result.files].filter(
      (file) =>
        /\/(components-legacy|hooks|components|presentation)\//.test(
          relative(file)
        ) &&
        !/\/ai-chat-components\/src\/components\/(chat-button|chain-of-thought)\/defs\.ts$/.test(
          file
        ) &&
        !/\/ai-chat-components\/src\/components\/prompt-line\/src\/types\.ts$/.test(
          file
        )
    )
  ).toEqual([]);
  // Only runtime imports create another entry owner; mixed/type-only imports are erased.
  for (const file of allFiles.filter((f) => !f.endsWith('.d.ts'))) {
    const text = ts.transpileModule(get(relative(file)).text, {
      fileName: file,
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.ReactJSX,
        experimentalDecorators: true,
      },
    }).outputText;
    const emitted = ts.createSourceFile(
      file + '.js',
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS
    );
    visit(emitted, (node) => {
      const specifier =
        ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
          ? node.moduleSpecifier
          : ts.isCallExpression(node) &&
              node.expression.kind === ts.SyntaxKind.ImportKeyword
            ? node.arguments[0]
            : undefined;
      if (!specifier || !ts.isStringLiteralLike(specifier)) {
        return;
      }
      const target = resolveSource(file, specifier.text, root);
      if (
        target &&
        workflows.includes(relative(target)) &&
        relative(target) !== messaging + 'MessageCoordinator.ts'
      ) {
        expect(workflows).toContain(relative(file));
      }
    });
  }
});

function fixture(files: Record<string, string>) {
  const virtual = Object.fromEntries(
    Object.entries(files).map(([f, text]) => [
      path.join(root, '__boundary_fixtures__', f),
      text,
    ])
  );
  const built = sourceProgram(Object.keys(virtual), virtual);
  for (const file of Object.keys(virtual)) {
    const source = built.program.getSourceFile(file)!;
    expect(
      built.program
        .getSemanticDiagnostics(source)
        .map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' '))
    ).toEqual([]);
  }
  return {
    ...built,
    files: virtual,
    source: (file = 'entry.ts') =>
      built.program.getSourceFile(
        path.join(root, '__boundary_fixtures__', file)
      )!,
  };
}

it('follows runtime aliases, re-exports and literal imports while dropping mixed type imports', () => {
  const files: Record<string, string> = {
    '/entry.ts':
      "import { type Data, value } from './data'; export { write as renamed } from './barrel'; export const n = value;",
    '/data.ts':
      'export interface Data { dispatch: string } export const value = 1;',
    '/barrel.ts': "export { write } from './effect';",
    '/effect.ts': "import './hidden'; export function write() {}",
    '/hidden.ts': 'export const state = {};',
  };
  const result = runtimeGraph(
    ['/entry.ts'],
    (f) => files[f],
    (f, s) => {
      const target = path.resolve(path.dirname(f), s) + '.ts';
      return target in files ? target : undefined;
    },
    new Set()
  );
  expect(result.issues).toEqual([]);
  expect(result.files.has('/hidden.ts')).toBe(true);
  for (const text of [
    "import './missing';",
    'export const read = (name: string) => import(name);',
    "require('./data');",
  ]) {
    expect(
      runtimeGraph(
        ['/entry.ts'],
        () => text,
        () => undefined,
        new Set()
      ).issues.length
    ).toBeGreaterThan(0);
  }
  expect(
    runtimeGraph(
      ['/entry.ts'],
      () =>
        'function require(value: string) { return value; } require("data");',
      () => undefined,
      new Set()
    ).issues
  ).toEqual([]);
});

it.each([
  "import type { ServiceManager as Renamed } from './ServiceManager'; export class Processor { constructor(private input: Renamed) {} }",
  "import type { ServiceManager as Renamed } from './ServiceManager'; type Selected = Pick<Renamed, 'store'>; export function prepare(value: Selected) { return 1; }",
  "export function prepare(value: import('./ServiceManager').ServiceManager['store']) { return 1; }",
  "import type { Wrapped } from './alias'; export function prepare(value: Wrapped) { return 1; }",
  "import type { Primitive } from './primitiveAlias'; export function prepare(value: Primitive) { return value; }",
  'export class Processor { get later() { return () => 1; } }',
  'export class Processor { set effect(value: () => void) { value(); } }',
  'export const processor = { prepare(effect: () => void) { effect(); } };',
  'export class Processor extends Map<string, () => void> {}',
  'export const Processor = class extends Map<string, () => void> {};',
  "import type { PropertyView } from './interfaceAlias'; export function prepare(value: PropertyView) { return value; }",
  "import type { InheritedView } from './interfaceAlias'; export function prepare(value: InheritedView) { return value; }",
  "import type { Holder } from './classAlias'; export function prepare(value: Holder) { return value; }",
  "import type { AppStore } from './appStore'; type Value = AppStore['label']; export function prepare(value: Value) { return value; }",
  'export function prepare() { return { nested: { later: () => 1 } }; }',
  'export const prepare = (effect: () => void) => effect();',
  'interface Effects { [name: string]: () => void }; export function prepare(effects: Effects) { effects.run(); }',
])('rejects effect capabilities through resolved types: %s', (entry) => {
  const f = fixture({
    'entry.ts': entry,
    'appStore.ts':
      'export interface AppStore { label: string; dispatch(action: unknown): void }',
    'ServiceManager.ts':
      'export interface ServiceManager { store: { dispatch(action: unknown): void }; namespace: string }',
    'alias.ts':
      "import type { ServiceManager } from './ServiceManager'; export type Wrapped = Pick<ServiceManager, 'namespace'>;",
    'primitiveAlias.ts':
      "import type { ServiceManager } from './ServiceManager'; export type Primitive = ServiceManager['namespace'];",
    'interfaceAlias.ts':
      "import type { ServiceManager } from './ServiceManager'; export interface PropertyView { namespace: ServiceManager['namespace'] }; export interface InheritedView extends Pick<ServiceManager, 'namespace'> {}",
    'classAlias.ts':
      "import type { ServiceManager } from './ServiceManager'; export class Holder { value: ServiceManager['namespace'] = 'namespace'; }",
  });
  expect(
    capabilityIssues(f.checker, f.source(), new Set()).length
  ).toBeGreaterThan(0);
});

it('accepts data-shaped names, supplied Dates and opaque payload types', () => {
  const f = fixture({
    'entry.ts':
      "import type { Message } from './data'; export function prepare(value: Message, date: Date, dispatch: string) { return { time: date.getTime(), length: Math.max(dispatch.length, 1), value }; }",
    'data.ts': 'export interface Message { user_defined: any }',
  });
  const data = f.source('data.ts').statements[0] as ts.InterfaceDeclaration;
  const allowed = new Set([f.checker.getSymbolAtLocation(data.name)!]);
  expect(capabilityIssues(f.checker, f.source(), allowed)).toEqual([]);
});

it('accepts data getters, setters, object methods and inherited data containers', () => {
  const f = fixture({
    'dataTypes.ts':
      "interface Fields { label: string }; export interface DataView extends Pick<Fields, 'label'> { value: Fields['label'] }; export class DataHolder { value: Fields['label'] = 'data'; }",
    'entry.ts': `
      import type { DataView, DataHolder } from './dataTypes';
      export const DataValues = class extends Map<string, string> {};
      export class DataState extends Map<string, string> {
        get label() { return 'ready'; }
        fail() { return { value: 'failed' }; }
        set label(value: string) { this.set('label', value); }
      }
      type Result = ReturnType<DataState['fail']>;
      export const processor = {
        prepare(value: string, date: Date) { return { value, time: date.getTime() }; },
        result(value: Result, view: DataView, holder: DataHolder) { return { value, view, holder }; },
      };
    `,
  });
  expect(capabilityIssues(f.checker, f.source(), new Set())).toEqual([]);
});
