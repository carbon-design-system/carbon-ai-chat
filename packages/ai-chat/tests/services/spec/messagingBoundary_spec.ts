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
  pureEffectIssues,
  snapshotDataCalls,
  callsIn,
  isRawStoreDispatch,
  viewCapabilityReads,
} from '../helpers/messagingBoundary';

const root = path.resolve(__dirname, '../../..');
const messaging = 'src/shared/services/messaging/';
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
  'src/shared/schema/inputItemData.ts',
  'src/shared/schema/outputItemData.ts',
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
  'src/types/instance/ChatSDKState.ts': ['ConversationStatus'],
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
    expect(pureEffectIssues(checker, source)).toEqual([]);
  }
});

it('checks native snapshot preparation while allowing only deferred host callable bodies', () => {
  const source = get(messaging + 'nativeMessageEvents.ts');
  const allowed = snapshotDataCalls(checker, source);
  expect(allowed.size).toBe(16); // Deferred traps, intrinsic reads and owned data operations.
  expect(pureEffectIssues(checker, source, allowed)).toEqual([]);
});

it('keeps core runtime imports and capabilities independent of the view', () => {
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
  const viewRights = new Set([
    'view',
    'slotEventService',
    'streamAnnouncerService',
  ]);
  const issues = [...result.files].flatMap((file) =>
    viewCapabilityReads(
      checker,
      program.getSourceFile(file)!,
      path.join(root, 'src/shared/services/ServiceManager.ts'),
      viewRights
    )
  );
  // Only these owners look up the attached view, once per call.
  expect([...new Set(issues.map((issue) => relative(issue)))].sort()).toEqual([
    messaging + 'HeadlessReasoningObserver.ts: view',
    messaging + 'MessageCoordinator.ts: view',
  ]);
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

it('requires every allowed workflow owner to exist', () => {
  for (const file of workflows) {
    expect(get(file).fileName).toBe(path.join(root, file));
  }
});

const transcriptWrites = new Set([
  'setChatMessagesStateProperty',
  'chatWasHydrated',
  'hydrateMessageHistory',
  'removeMessages',
  'restartConversation',
  'addLocalMessageItem',
  'addMessage',
  'updateLocalMessageItem',
  'updateMessage',
  'upsertMessage',
  'endMessageStreaming',
  'messageSetOptionSelected',
  'setConversationLifecycle',
  'setActiveResponseId',
  'setMessageUIProperty',
  'setMessageResponseHistoryProperty',
  'setMessageUIStateInternalProperty',
  'mergeMessageHistory',
  'setMessageErrorState',
  'removeLocalMessageItem',
  'setStopStreamingButtonVisible',
  'setStopStreamingButtonDisabled',
  'setStopStreamingButtonMetadataDisabled',
  'setStreamID',
  'setIsRestarting',
]);
const sharedWrites: Record<string, string[]> = {
  'src/shared/utils/messageEventOwnership.ts': [
    'updateMessage',
    'updateLocalMessageItem',
  ],
  'src/shared/utils/streamingUtils.ts': [
    'setStopStreamingButtonVisible',
    'setStopStreamingButtonDisabled',
    'setStopStreamingButtonMetadataDisabled',
  ],
  'src/shared/services/haa/HumanAgentServiceImpl.ts': [
    'updateMessage',
    'updateLocalMessageItem',
    'setMessageUIStateInternalProperty',
    'setMessageErrorState',
    'setMessageResponseHistoryProperty',
  ],
  'src/shared/services/haa/humanAgentUtils.ts': ['addLocalMessageItem'],
};
const captureRoots = new Set([
  messaging + 'coordinateMessageEvents.ts',
  messaging + 'UpsertWorkflow.ts',
  messaging + 'ChunkWorkflow.ts',
  'src/shared/services/haa/HumanAgentServiceImpl.ts',
  'src/shared/services/haa/humanAgentUtils.ts',
  'src/chat/services/CustomPanelInstance.ts',
]);
const calls = callsIn(
  checker,
  allFiles.map((f) => program.getSourceFile(f)!)
);

const metadataFile = 'src/chat/utils/messageMetadataCommands.ts';
function metadataEntryBranch(fn: ts.FunctionDeclaration) {
  const branch = fn.body?.statements[0];
  if (
    fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ||
    fn.body?.statements.length !== 1 ||
    !branch ||
    !ts.isIfStatement(branch) ||
    !ts.isCallExpression(branch.expression)
  ) {
    return undefined;
  }
  return { branch, predicateCall: branch.expression };
}

function metadataPredicateIssues(
  fn: ts.FunctionDeclaration,
  call: ts.CallExpression,
  expectedName: string
) {
  const issues: string[] = [];
  const predicate = checker.getResolvedSignature(call)?.declaration as
    ts.FunctionDeclaration | undefined;
  if (
    !predicate ||
    relative(predicate.getSourceFile().fileName) !==
      'src/shared/store/messageOwnership.ts' ||
    predicate.name?.text !== expectedName
  ) {
    issues.push('metadata routing lost ingress provenance');
  }
  const managerSymbol = checker.getSymbolAtLocation(fn.parameters[0].name);
  const predicateStore = call.arguments[0];
  if (
    fn.parameters.length !== 3 ||
    call.arguments.length !== 2 ||
    !predicateStore ||
    !ts.isPropertyAccessExpression(predicateStore) ||
    predicateStore.name.text !== 'store' ||
    checker.getSymbolAtLocation(predicateStore.expression) !== managerSymbol ||
    checker.getSymbolAtLocation(call.arguments[1]) !==
      checker.getSymbolAtLocation(fn.parameters[1].name)
  ) {
    issues.push('metadata predicate arguments changed');
  }
  return issues;
}

function metadataWriterCalls(
  block: ts.Block,
  expectedName: string,
  targetFile: string,
  args: ts.Symbol[]
) {
  const guarded = new Set<ts.Node>();
  const issues: string[] = [];
  let matched = 0;
  let callCount = 0;
  visit(block, (node) => {
    if (!ts.isCallExpression(node)) {
      return;
    }
    callCount++;
    const declaration = checker.getResolvedSignature(node)?.declaration as
      ts.MethodDeclaration | undefined;
    if (
      !declaration ||
      relative(declaration.getSourceFile().fileName) !== targetFile ||
      declaration.name?.getText() !== expectedName
    ) {
      return;
    }
    matched++;
    if (
      node.arguments.length !== args.length ||
      node.arguments.some(
        (arg, index) => checker.getSymbolAtLocation(arg) !== args[index]
      )
    ) {
      issues.push('metadata argument identity changed');
    }
    if (targetFile === 'src/shared/store/actions.ts') {
      guarded.add(node);
    }
  });
  if (
    matched !== 1 ||
    callCount !== (targetFile === 'src/shared/store/actions.ts' ? 2 : 1)
  ) {
    issues.push('metadata route lost its exact writer');
  }
  return { guarded, issues };
}

function metadataBranchWrites(
  block: ts.Statement | undefined,
  expectedName: string,
  targetFile: string,
  args: ts.Symbol[]
) {
  const guarded = new Set<ts.Node>();
  const issues: string[] = [];
  if (!block || !ts.isBlock(block) || block.statements.length !== 1) {
    issues.push('metadata branch gained effects');
    return { guarded, issues };
  }
  const statement = block.statements[0];
  if (
    !ts.isExpressionStatement(statement) ||
    !ts.isCallExpression(statement.expression)
  ) {
    issues.push('metadata branch is not one synchronous call');
    return { guarded, issues };
  }
  const outer = checker.getResolvedSignature(statement.expression)?.declaration;
  const expectedOuter =
    targetFile === 'src/shared/store/actions.ts'
      ? 'src/shared/store/appStore.ts'
      : targetFile;
  if (!outer || relative(outer.getSourceFile().fileName) !== expectedOuter) {
    issues.push('metadata branch changed its dispatch owner');
  }
  const writes = metadataWriterCalls(block, expectedName, targetFile, args);
  return { guarded: writes.guarded, issues: [...issues, ...writes.issues] };
}

function guardedMetadataWrites() {
  const guarded = new Set<ts.Node>();
  const issues: string[] = [];
  const expected: Record<string, [string, string, string]> = {
    mergeMessageHistoryFromView: [
      'isHumanAgentMessageOwner',
      'mergeMessageHistory',
      'mergeMessageHistory',
    ],
    setMessageOptionSelectedFromView: [
      'isHumanAgentLocalOwner',
      'messageSetOptionSelected',
      'setMessageOptionSelected',
    ],
  };
  const functions = get(metadataFile).statements.filter(
    ts.isFunctionDeclaration
  );
  if (functions.length !== 2) {
    issues.push('unexpected metadata entry');
  }
  for (const fn of functions) {
    const names = expected[fn.name?.text ?? ''];
    const route = metadataEntryBranch(fn);
    if (!names || !route) {
      issues.push('metadata routing shape changed');
      continue;
    }
    issues.push(...metadataPredicateIssues(fn, route.predicateCall, names[0]));
    const args = fn.parameters
      .slice(1)
      .map((p) => checker.getSymbolAtLocation(p.name));
    for (const [block, expectedName, targetFile] of [
      [route.branch.thenStatement, names[1], 'src/shared/store/actions.ts'],
      [
        route.branch.elseStatement,
        names[2],
        messaging + 'MessageCoordinator.ts',
      ],
    ] as const) {
      const writes = metadataBranchWrites(
        block,
        expectedName,
        targetFile,
        args
      );
      issues.push(...writes.issues);
      writes.guarded.forEach((node) => guarded.add(node));
    }
  }
  return { guarded, issues };
}

it('keeps shared metadata writes behind the exact ingress-owned HAA branches', () => {
  expect(guardedMetadataWrites().issues).toEqual([]);
});

it('roots assistant writes and shared guarded helpers in named owners', () => {
  const issues: string[] = [];
  const seenCaptures = new Set<string>();
  const metadataWrites = guardedMetadataWrites().guarded;
  for (const call of calls) {
    const file = relative(call.source.fileName),
      target = relative(call.file);
    if (file === 'src/shared/store/actions.ts') {
      continue;
    }
    if (
      target === 'src/shared/store/actions.ts' &&
      transcriptWrites.has(call.name ?? '') &&
      !workflows.includes(file) &&
      !sharedWrites[file]?.includes(call.name!) &&
      !metadataWrites.has(call.node)
    ) {
      issues.push(`${file}: ${call.name}`);
    }
    if (
      target === 'src/shared/utils/messageEventOwnership.ts' &&
      call.name === 'captureMessageEvent'
    ) {
      seenCaptures.add(file);
      if (!captureRoots.has(file)) {
        issues.push(`${file}: captureMessageEvent`);
      }
    }
    if (
      target === 'src/shared/utils/streamingUtils.ts' &&
      ['resetStopStreamingButton', 'syncStopStreamingButton'].includes(
        call.name ?? ''
      ) &&
      !workflows.includes(file)
    ) {
      issues.push(`${file}: Stop helper`);
    }
  }
  expect(issues).toEqual([]);
  expect([...seenCaptures].sort()).toEqual([...captureRoots].sort());
});

it('keeps ownership bookkeeping and ingress annotations at their exact internal seams', () => {
  const roots: Record<string, string[]> = {
    enableMessageOwnership: ['src/shared/store/doCreateStore.ts'],
    commitMessageOwnership: ['src/shared/store/appStore.ts'],
    markHumanAgentIngress: ['src/shared/services/haa/humanAgentUtils.ts'],
    captureMessageOwnership: [messaging + 'HistoryWorkflow.ts'],
    retainHistoryOwnership: [messaging + 'HistoryWorkflow.ts'],
    retainMessageCloneOwnership: ['src/shared/utils/messageEventOwnership.ts'],
    retainLocalCloneOwnership: ['src/shared/utils/messageEventOwnership.ts'],
    isHumanAgentMessageOwner: [metadataFile],
    isHumanAgentLocalOwner: [metadataFile],
  };
  const seen = new Map<string, Set<string>>();
  for (const call of calls) {
    const file = relative(call.source.fileName);
    if (
      relative(call.file) !== 'src/shared/store/messageOwnership.ts' ||
      file === 'src/shared/store/messageOwnership.ts'
    ) {
      continue;
    }
    expect(roots[call.name ?? '']).toContain(file);
    const values = seen.get(call.name!) ?? new Set<string>();
    values.add(file);
    seen.set(call.name!, values);
  }
  for (const [name, files] of Object.entries(roots)) {
    expect([...(seen.get(name) ?? [])].sort()).toEqual([...files].sort());
  }
});

function isAllowedStateField(
  file: string,
  key: ts.Expression | undefined
): boolean {
  const allowed: Record<string, string[]> = {
    'src/chat/AppShell.tsx': ['chatWidth', 'chatHeight', 'chatWidthBreakpoint'],
    'src/chat/utils/shellLifecycle.ts': [
      'chatWidth',
      'chatHeight',
      'chatWidthBreakpoint',
    ],
    'src/chat/services/createViewBindings.ts': ['catastrophicErrorType'],
    'src/chat/utils/dynamicConfigUpdates.ts': ['languagePack'],
    'src/chat/utils/appConfigUpdates.ts': ['markdownConfig'],
    'src/web-components/cds-aichat-container/cds-aichat-container.ts': [
      'markdownConfig',
    ],
  };
  return Boolean(
    key && ts.isStringLiteral(key) && allowed[file]?.includes(key.text)
  );
}

it('limits broad state writes to exact non-transcript fields', () => {
  for (const call of calls) {
    if (relative(call.file) !== 'src/shared/store/actions.ts') {
      continue;
    }
    const file = relative(call.source.fileName);
    if (call.name === 'setAppStateValue') {
      const key = call.node.arguments?.[0];
      expect(isAllowedStateField(file, key)).toBe(true);
    }
    if (call.name === 'changeState') {
      const value = call.node.arguments?.[0];
      expect(file).toBe('src/chat/utils/dynamicConfigUpdates.ts');
      expect(value && ts.isObjectLiteralExpression(value)).toBe(true);
      if (value && ts.isObjectLiteralExpression(value)) {
        expect(
          value.properties.every(
            (p) =>
              ts.isPropertyAssignment(p) &&
              ['config', 'persistedToBrowserStorage'].includes(p.name.getText())
          )
        ).toBe(true);
      }
    }
  }
});

it.each([
  ['src/chat/AppShell.tsx', "'chatWidth'", true],
  ['src/chat/utils/shellLifecycle.ts', "'chatWidth'", true],
  ['src/chat/utils/shellLifecycle.ts', "'chatHeight'", true],
  ['src/chat/utils/shellLifecycle.ts', "'chatWidthBreakpoint'", true],
  ['src/chat/utils/shellLifecycle.ts', "'messages'", false],
  ['src/chat/utils/shellLifecycle.ts', "'assistantInputState'", false],
  ['src/chat/utils/otherShell.ts', "'chatWidth'", false],
  ['src/chat/utils/shellLifecycle.ts', 'field', false],
])('limits dimension writes at %s with %s', (file, expression, allowed) => {
  const source = ts.createSourceFile(
    'field.ts',
    expression,
    ts.ScriptTarget.Latest,
    true
  );
  const statement = source.statements[0];
  expect(ts.isExpressionStatement(statement)).toBe(true);
  if (ts.isExpressionStatement(statement)) {
    expect(isAllowedStateField(file, statement.expression)).toBe(allowed);
  }
});

function walkBoundCalls(
  node: ts.Node,
  check: (call: ts.CallExpression) => void,
  seen = new Set<ts.Node>()
) {
  if (seen.has(node)) {
    return;
  }
  seen.add(node);
  visit(node, (call) => {
    if (!ts.isCallExpression(call)) {
      return;
    }
    check(call);
    const declaration = checker.getResolvedSignature(call)?.declaration;
    const body =
      declaration && 'body' in declaration
        ? (declaration.body as ts.Node | undefined)
        : undefined;
    if (
      body &&
      declaration.getSourceFile().fileName.startsWith(path.join(root, 'src'))
    ) {
      walkBoundCalls(body, check, seen);
    }
  });
}

it('keeps the adapter types and actual boot bindings view-only', () => {
  const adapter = 'src/chat/services/MessagePresentationAdapter.ts';
  const announcer = messaging + 'presentation/StreamAnnouncerService.ts';
  const adapterGraph = graph([adapter, announcer], new Set());
  expect(adapterGraph.issues).toEqual([]);
  expect([...adapterGraph.files].map(relative).sort()).toEqual(
    [adapter, announcer].sort()
  );
  expect(capabilityIssues(checker, get(announcer), leaves, true)).toEqual([]);
  expect(capabilityIssues(checker, get(adapter), leaves, true)).toEqual([]);
  expect(
    capabilityIssues(
      checker,
      get(messaging + 'presentationPort.ts'),
      leaves,
      true
    )
  ).toEqual([]);
  const expectedSinks: Record<string, string[]> = {
    openHomeScreen: ['setHomeScreenIsOpen'],
    openHistoryResponsePanel: [
      'setResponsePanelContent',
      'setResponsePanelIsOpen',
    ],
    getMessagesScrollBottom: [],
    restoreMessagesScroll: [],
    announceSendFailure: ['announceMessage'],
    announceStreamStarts: [],
    getUserDefinedResponseSlot: [],
    hasCustomPromptLine: [],
    requestComposerFocus: [],
    announceSending: [],
    isHomeScreenOpen: [],
    closeHomeScreen: ['setHomeScreenIsOpen'],
    isResponsePanelOpen: [],
    closeResponsePanel: ['setResponsePanelIsOpen'],
    // The loading counters and announcements are view state (#1831).
    announce: ['announceMessage'],
    changeMessageLoadingCounter: ['addIsLoadingCounter'],
    updateMessageLoadingCounter: [
      'resetIsLoadingCounter',
      'addIsLoadingCounter',
      'addIsLoadingCounter',
      'addIsLoadingCounter',
    ],
    changeChatLoadingCounter: ['addIsHydratingCounter'],
    updateChatLoadingCounter: [
      'resetIsHydratingCounter',
      'addIsHydratingCounter',
      'addIsHydratingCounter',
    ],
  };
  const port = get(messaging + 'presentationPort.ts').statements.find(
    (n): n is ts.InterfaceDeclaration =>
      ts.isInterfaceDeclaration(n) && n.name.text === 'MessagePresentationPort'
  )!;
  expect(port.members.map((m) => m.name?.getText()).sort()).toEqual(
    [
      'openHomeScreen',
      'openHistoryResponsePanel',
      'getMessagesScrollBottom',
      'restoreMessagesScroll',
      'announceSendFailure',
      'announceStreamStarts',
      'getUserDefinedResponseSlot',
      'hasCustomPromptLine',
      'announceSending',
      'requestComposerFocus',
      'closeHomeScreenIfOpen',
      'closeResponsePanelIfOpen',
      'closeHomeScreen',
      'announce',
      'changeMessageLoadingCounter',
      'updateMessageLoadingCounter',
      'changeChatLoadingCounter',
      'updateChatLoadingCounter',
    ].sort()
  );
  let found = false;
  // The container attaches these bindings when it boots a mount.
  visit(get('src/chat/services/createViewBindings.ts'), (node) => {
    if (!ts.isNewExpression(node) || !ts.isIdentifier(node.expression)) {
      return;
    }
    let symbol = checker.getSymbolAtLocation(node.expression);
    if (symbol?.flags & ts.SymbolFlags.Alias) {
      symbol = checker.getAliasedSymbol(symbol);
    }
    if (
      !symbol?.declarations?.some(
        (d) => relative(d.getSourceFile().fileName) === adapter
      )
    ) {
      return;
    }
    found = true;
    const bindings = node.arguments?.[0];
    expect(bindings && ts.isObjectLiteralExpression(bindings)).toBe(true);
    if (!bindings || !ts.isObjectLiteralExpression(bindings)) {
      return;
    }
    expect(bindings.properties.map((p) => p.name?.getText()).sort()).toEqual(
      Object.keys(expectedSinks).sort()
    );
    for (const binding of bindings.properties) {
      expect(ts.isPropertyAssignment(binding)).toBe(true);
      if (!ts.isPropertyAssignment(binding)) {
        continue;
      }
      const expected = expectedSinks[binding.name.getText()];
      const actual: string[] = [];
      walkBoundCalls(binding.initializer, (call) => {
        expect(
          isRawStoreDispatch(
            checker,
            call,
            path.join(root, 'src/shared/store/appStore.ts'),
            path.join(root, 'src/shared/store/actions.ts')
          )
        ).toBe(false);
        if (!ts.isCallExpression(call)) {
          return;
        }
        const signature = checker.getResolvedSignature(call)?.declaration;
        if (!signature) {
          return;
        }
        const target = relative(signature.getSourceFile().fileName);
        if (target === 'src/shared/store/actions.ts') {
          const name = (signature as ts.MethodDeclaration).name?.getText();
          if (name) {
            actual.push(name);
          }
        }
        // These named operations may not hide a send, event, or core write.
        expect(
          target === messaging + 'MessageCoordinator.ts' ||
            target === 'src/shared/services/ChatInstanceService.ts' ||
            target === 'src/shared/events/EventBus.ts'
        ).toBe(false);
      });
      expect(actual).toEqual(expected);
    }
  });
  expect(found).toBe(true);
  // Follow the separate stream-announcer callback too; an interface call alone hides its boot binding.
  let foundStream = false;
  visit(get('src/shared/services/loadServices.ts'), (node) => {
    if (!ts.isNewExpression(node)) {
      return;
    }
    const declaration = checker.getResolvedSignature(node)?.declaration;
    if (
      !declaration ||
      relative(declaration.getSourceFile().fileName) !==
        messaging + 'presentation/StreamAnnouncerService.ts'
    ) {
      return;
    }
    foundStream = true;
    const binding = node.arguments?.[0];
    expect(binding && ts.isObjectLiteralExpression(binding)).toBe(true);
    if (!binding || !ts.isObjectLiteralExpression(binding)) {
      return;
    }
    expect(binding.properties.map((p) => p.name?.getText())).toEqual([
      'announceStreamStart',
    ]);
    const sinks: string[] = [];
    walkBoundCalls(binding, (call) => {
      expect(
        isRawStoreDispatch(
          checker,
          call,
          path.join(root, 'src/shared/store/appStore.ts'),
          path.join(root, 'src/shared/store/actions.ts')
        )
      ).toBe(false);
      const d = checker.getResolvedSignature(call)?.declaration;
      if (!d) {
        return;
      }
      const file = relative(d.getSourceFile().fileName);
      expect(
        file === messaging + 'MessageCoordinator.ts' ||
          file === 'src/shared/services/ChatInstanceService.ts' ||
          file === 'src/shared/events/EventBus.ts'
      ).toBe(false);
      if (file === 'src/shared/store/actions.ts') {
        sinks.push((d as ts.MethodDeclaration).name.getText());
      }
      // The announcement reaches the view only through its port (#1831).
      if (
        file === messaging + 'presentationPort.ts' &&
        ts.isPropertyAccessExpression(call.expression)
      ) {
        sinks.push(`port.${call.expression.name.text}`);
      }
    });
    expect(sinks).toEqual(['port.announce']);
  });
  expect(foundStream).toBe(true);
  // Other boot dispatches remain view-only too.
  const streamCalls = calls.filter(
    (c) =>
      relative(c.source.fileName) === 'src/shared/services/loadServices.ts' &&
      relative(c.file) === 'src/shared/store/actions.ts'
  );
  expect(
    streamCalls.every((c) =>
      [
        'announceMessage',
        'setHomeScreenIsOpen',
        'setResponsePanelContent',
        'setResponsePanelIsOpen',
      ].includes(c.name ?? '')
    )
  ).toBe(true);
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

it('accepts data-shaped names, supplied Dates and opaque payloads without allowing invocation', () => {
  const f = fixture({
    'entry.ts':
      "import type { Message } from './data'; export function prepare(value: Message, date: Date, dispatch: string) { return { time: date.getTime(), length: Math.max(dispatch.length, 1), value }; }",
    'data.ts': 'export interface Message { user_defined: any }',
  });
  const data = f.source('data.ts').statements[0] as ts.InterfaceDeclaration;
  const allowed = new Set([f.checker.getSymbolAtLocation(data.name)!]);
  expect(capabilityIssues(f.checker, f.source(), allowed)).toEqual([]);
  expect(pureEffectIssues(f.checker, f.source())).toEqual([]);
  const bad = fixture({
    'entry.ts':
      'export function prepare(payload: any) { return payload.run(); }',
  });
  expect(pureEffectIssues(bad.checker, bad.source()).length).toBeGreaterThan(0);
});

it.each([
  'const clock = Date.now; clock();',
  'new Date();',
  'Date();',
  'Math.random();',
  'fetch("url");',
  'setTimeout(() => {}, 1);',
  'performance.now();',
  'document.title;',
])('rejects resolved effects: %s', (entry) => {
  const f = fixture({ 'entry.ts': entry });
  expect(pureEffectIssues(f.checker, f.source()).length).toBeGreaterThan(0);
});

it('resolves writer aliases and a view callback that hides a message write', () => {
  const f = fixture({
    'entry.ts':
      "import renamed from './actions'; const { addMessage: write } = renamed; export const capabilities = { closeHomeScreen: () => write('message') };",
    'actions.ts':
      'export default { addMessage(value: string) { return value; } };',
  });
  const result = callsIn(f.checker, [f.source()]);
  expect(result.map((c) => c.name)).toEqual(['addMessage']);
  expect(result[0].file).toBe(
    path.join(root, '__boundary_fixtures__/actions.ts')
  );
});

it('rejects raw dispatch alongside a valid view action, including a dispatch alias', () => {
  const f = fixture({
    'entry.ts':
      "import type { Store } from './appStore'; import actions from './actions'; export function close(store: Store) { store.dispatch(actions.view()); const send = store.dispatch; send({ type: 'UPSERT_MESSAGE' }); }",
    'appStore.ts':
      'type DispatchFunction = (action: unknown) => unknown; export interface Store { dispatch: DispatchFunction }',
    'actions.ts':
      "export default { view() { return { type: 'CLOSE_HOME' }; } };",
  });
  const found: boolean[] = [];
  visit(f.source(), (node) => {
    if (ts.isCallExpression(node)) {
      found.push(
        isRawStoreDispatch(
          f.checker,
          node,
          f.source('appStore.ts').fileName,
          f.source('actions.ts').fileName
        )
      );
    }
  });
  expect(found.filter(Boolean)).toEqual([true]);
});

it('checks view rights inside a transitive helper whose manager import erases', () => {
  const f = fixture({
    'entry.ts': "export { read } from './helper';",
    'helper.ts':
      "import type { ServiceManager } from './ServiceManager'; export function read(manager: ServiceManager) { const { slotEventService: slots } = manager; return slots; }",
    'ServiceManager.ts':
      'export interface ServiceManager { slotEventService: { slot: string } }',
  });
  const result = runtimeGraph(
    [f.source().fileName],
    (file) => f.files[file],
    (file, specifier) => {
      const resolved = path.resolve(path.dirname(file), specifier) + '.ts';
      return resolved in f.files ? resolved : undefined;
    },
    new Set()
  );
  expect(result.files.has(f.source('ServiceManager.ts').fileName)).toBe(false);
  const issues = [...result.files].flatMap((file) =>
    viewCapabilityReads(
      f.checker,
      f.program.getSourceFile(file)!,
      f.source('ServiceManager.ts').fileName,
      new Set(['slotEventService'])
    )
  );
  expect(issues).toHaveLength(1);
});

it('rejects invoking an opaque host callback through a type assertion', () => {
  const f = fixture({
    'entry.ts':
      'interface Message { user_defined: any }; export function prepare(message: Message) { return (message.user_defined.run as () => void)(); }',
  });
  expect(pureEffectIssues(f.checker, f.source()).length).toBeGreaterThan(0);
});

it.each([
  'Reflect.apply(value, undefined, []);',
  'Reflect.construct(value, []);',
  '(value as Function).call(undefined);',
  '(value as Function).apply(undefined, []);',
  '(value as () => void)();',
  'setTimeout(() => {}, 0);',
])('rejects eager host execution during snapshot preparation: %s', (body) => {
  const f = fixture({
    'entry.ts': `export function snapshot(value: any) { ${body} return value; }`,
  });
  expect(
    pureEffectIssues(
      f.checker,
      f.source(),
      snapshotDataCalls(f.checker, f.source())
    ).length
  ).toBeGreaterThan(0);
});

it('allows deferred Proxy call traps but still checks preparation-time getter traps', () => {
  const f = fixture({
    'entry.ts': `export function snapshot(value: Function) {
    const bindingTarget = new Proxy(value, { get: () => Reflect.apply(value, undefined, []) });
    return new Proxy(Function.prototype.bind.call(bindingTarget, undefined), {
      apply: (_target, receiver, args) => Reflect.apply(value, receiver, args),
      construct: (_target, args, newTarget) => Reflect.construct(value, args, newTarget)
    });
  }`,
  });
  const allowed = snapshotDataCalls(f.checker, f.source());
  expect(allowed.size).toBe(3);
  expect(pureEffectIssues(f.checker, f.source(), allowed)).toEqual([
    expect.stringContaining('reflective host invocation'),
  ]);
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

it.each([
  "document['title'];",
  'document[`title`];',
  'const { title: read } = document; read;',
  'function read({ title }: Document) { return title; }',
])('rejects resolved ambient property reads: %s', (entry) => {
  const f = fixture({ 'entry.ts': entry });
  expect(pureEffectIssues(f.checker, f.source()).length).toBeGreaterThan(0);
});

it.each([
  'export function read(manager: ServiceManager) { return manager[`mainWindow`]; }',
  'export function read({ mainWindow: view }: ServiceManager) { return view; }',
])('rejects resolved view rights through property syntax: %s', (entry) => {
  const f = fixture({
    'entry.ts': `import type { ServiceManager } from './ServiceManager'; ${entry}`,
    'ServiceManager.ts':
      'export interface ServiceManager { mainWindow: string }',
  });
  expect(
    viewCapabilityReads(
      f.checker,
      f.source(),
      f.source('ServiceManager.ts').fileName,
      new Set(['mainWindow'])
    )
  ).toHaveLength(1);
});

it('accepts ordinary data properties with ambient and view names', () => {
  const f = fixture({
    'entry.ts':
      'interface Data { title: string; mainWindow: string }; export function read({ title }: Data, data: Data) { const { mainWindow } = data; return [title, mainWindow, data[`mainWindow`], data["title"]]; }',
    'ServiceManager.ts':
      'export interface ServiceManager { mainWindow: string }',
  });
  expect(pureEffectIssues(f.checker, f.source())).toEqual([]);
  expect(
    viewCapabilityReads(
      f.checker,
      f.source(),
      f.source('ServiceManager.ts').fileName,
      new Set(['mainWindow'])
    )
  ).toEqual([]);
});

it('allows implemented view methods only in view mode and keeps their arguments data-only', () => {
  const f = fixture({
    'entry.ts':
      "import type { ViewPort } from './port'; export class Adapter implements ViewPort { close() {} }",
    'port.ts': 'export interface ViewPort { close(): void }',
  });
  expect(capabilityIssues(f.checker, f.source(), new Set(), true)).toEqual([]);
  expect(
    capabilityIssues(f.checker, f.source(), new Set()).length
  ).toBeGreaterThan(0);
  const bad = fixture({
    'entry.ts':
      "import type { ViewPort } from './port'; export class Adapter implements ViewPort { close(callback: () => void) {} }",
    'port.ts':
      'export interface ViewPort { close(callback: () => void): void }',
  });
  expect(
    capabilityIssues(bad.checker, bad.source(), new Set(), true).length
  ).toBeGreaterThan(0);
});

it('classifies a destructured broad message-state setter as an assistant write', () => {
  const f = fixture({
    'entry.ts':
      "import actions from './actions'; const { setChatMessagesStateProperty: write } = actions; write('messageIDs', []);",
    'actions.ts':
      'export default { setChatMessagesStateProperty(key: string, value: unknown) { return { key, value }; } };',
  });
  const writes = callsIn(f.checker, [f.source()]).filter(
    (call) =>
      call.file === f.source('actions.ts').fileName &&
      transcriptWrites.has(call.name ?? '')
  );
  expect(writes.map((call) => call.name)).toEqual([
    'setChatMessagesStateProperty',
  ]);
});

it('recognizes current intrinsic snapshot preparation without eager host invocation', () => {
  const source = get(messaging + 'nativeMessageEvents.ts');
  const allowed = snapshotDataCalls(checker, source);
  expect(pureEffectIssues(checker, source, allowed)).toEqual([]);
});

it.each([
  [
    'Reflect.construct(\n      BufferConstructor,',
    'Reflect.construct(\n      value as Function,',
  ],
  ['isCollection(value, Map.prototype)', 'isCollection(value, value as any)'],
  [
    '? [ArrayBuffer]\n      : [ArrayBuffer, SharedArrayBuffer]',
    '? [ArrayBuffer]\n      : [ArrayBuffer, value as any]',
  ],
  [
    'Function.prototype.toString.call(constructor)',
    '(constructor as Function).call(undefined)',
  ],
  [
    'copies.set(value, owned);\n    if (map)',
    'copies.set(value, owned);\n    owned = value;\n    if (map)',
  ],
])('rejects replacing an intrinsic snapshot binding: %s', (before, after) => {
  const original = get(messaging + 'nativeMessageEvents.ts').text;
  expect(original).toContain(before);
  const file = '../src/shared/services/messaging/nativeMessageEvents.ts';
  const f = fixture({ [file]: original.replace(before, after) });
  const source = f.source(file);
  expect(
    pureEffectIssues(f.checker, source, snapshotDataCalls(f.checker, source))
      .length
  ).toBeGreaterThan(0);
});

it.each([
  'const read = Date.now.bind(Date); read();',
  'const random = Math.random.bind(Math); random();',
  'export function prepare(effect: () => string) { const run = effect.bind(undefined); return run(); }',
])('rejects a bound effect or supplied callback: %s', (entry) => {
  const f = fixture({ 'entry.ts': entry });
  expect(pureEffectIssues(f.checker, f.source()).length).toBeGreaterThan(0);
});

it('accepts binding and invoking a known local data function', () => {
  const f = fixture({
    'entry.ts':
      'function double(value: number) { return value * 2; } const read = double.bind(undefined, 2); export const value = read();',
  });
  expect(pureEffectIssues(f.checker, f.source())).toEqual([]);
});

function rawActionValue(
  typeChecker: ts.TypeChecker,
  node: ts.Expression | undefined,
  creatorFiles: Set<string>,
  ownershipFile: string,
  seen = new Set<ts.Symbol>()
): boolean {
  if (!node) {
    return false;
  }
  if (ts.isCallExpression(node)) {
    const declaration = typeChecker.getResolvedSignature(node)?.declaration;
    if (!declaration) {
      return false;
    }
    const file = declaration.getSourceFile().fileName;
    if (creatorFiles.has(file)) {
      return true;
    }
    const name = (declaration as ts.FunctionDeclaration).name?.getText();
    return (
      file === ownershipFile &&
      [
        'markHumanAgentIngress',
        'retainHistoryOwnership',
        'retainMessageCloneOwnership',
        'retainLocalCloneOwnership',
      ].includes(name ?? '') &&
      rawActionValue(
        typeChecker,
        node.arguments[0],
        creatorFiles,
        ownershipFile,
        seen
      )
    );
  }
  if (!ts.isIdentifier(node)) {
    return false;
  }
  const symbol = typeChecker.getSymbolAtLocation(node);
  if (!symbol || seen.has(symbol)) {
    return false;
  }
  seen.add(symbol);
  const declaration = symbol.valueDeclaration;
  return Boolean(
    declaration &&
    ts.isVariableDeclaration(declaration) &&
    ts.isVariableDeclarationList(declaration.parent) &&
    declaration.parent.flags & ts.NodeFlags.Const &&
    rawActionValue(
      typeChecker,
      declaration.initializer,
      creatorFiles,
      ownershipFile,
      seen
    )
  );
}

function rawActionProperties(node: ts.Expression | undefined) {
  if (!node || !ts.isObjectLiteralExpression(node)) {
    return undefined;
  }
  const properties = new Map<string, ts.Expression>();
  for (const property of node.properties) {
    if (
      !ts.isPropertyAssignment(property) ||
      (!ts.isIdentifier(property.name) &&
        !ts.isStringLiteralLike(property.name))
    ) {
      return undefined;
    }
    if (properties.has(property.name.text)) {
      return undefined;
    }
    properties.set(property.name.text, property.initializer);
  }
  return properties;
}

function rawActionConstant(
  typeChecker: ts.TypeChecker,
  value: ts.Expression | undefined,
  file: string,
  text: string
) {
  if (!value || !ts.isIdentifier(value)) {
    return false;
  }
  let symbol = typeChecker.getSymbolAtLocation(value);
  if (symbol?.flags & ts.SymbolFlags.Alias) {
    symbol = typeChecker.getAliasedSymbol(symbol);
  }
  const declaration = symbol?.valueDeclaration;
  return Boolean(
    declaration &&
    ts.isVariableDeclaration(declaration) &&
    declaration.getSourceFile().fileName === file &&
    declaration.initializer &&
    ts.isStringLiteralLike(declaration.initializer) &&
    declaration.initializer.text === text
  );
}

function allowedRawAction(
  typeChecker: ts.TypeChecker,
  file: string,
  node: ts.Expression | undefined,
  actionsFile: string
) {
  const properties = rawActionProperties(node);
  if (!properties) {
    return false;
  }
  const type = properties.get('type');
  if (file === 'src/chat/utils/chatBoot.ts') {
    const key = properties.get('key');
    return (
      properties.size === 3 &&
      type &&
      ts.isStringLiteralLike(type) &&
      type.text === 'SET_APP_STATE_VALUE' &&
      key &&
      ts.isStringLiteralLike(key) &&
      key.text === 'catastrophicErrorType' &&
      properties.get('value')?.kind === ts.SyntaxKind.TrueKeyword
    );
  }
  return (
    file === 'src/shared/services/ThemeWatcherService.ts' &&
    properties.size === 2 &&
    properties.has('themeState') &&
    rawActionConstant(typeChecker, type, actionsFile, 'UPDATE_THEME_STATE')
  );
}

it('rejects raw store writes throughout the package except exact existing view state actions', () => {
  const actionsFile = path.join(root, 'src/shared/store/actions.ts');
  const creatorFiles = new Set([
    actionsFile,
    path.join(root, 'src/shared/store/humanAgentActions.ts'),
  ]);
  const ownershipFile = path.join(root, 'src/shared/store/messageOwnership.ts');
  const issues: string[] = [];
  for (const call of calls) {
    if (
      !ts.isCallExpression(call.node) ||
      !isRawStoreDispatch(
        checker,
        call.node,
        path.join(root, 'src/shared/store/appStore.ts'),
        actionsFile
      )
    ) {
      continue;
    }
    const argument = call.node.arguments[0];
    if (
      !rawActionValue(checker, argument, creatorFiles, ownershipFile) &&
      !allowedRawAction(
        checker,
        relative(call.source.fileName),
        argument,
        actionsFile
      )
    ) {
      issues.push(`${relative(call.source.fileName)}: ${argument?.getText()}`);
    }
  }
  expect(issues).toEqual([]);
});

it.each([
  [
    'src/chat/utils/chatBoot.ts',
    "{type: 'SET_APP_STATE_VALUE', key: 'catastrophicErrorType', value: true}",
    true,
  ],
  [
    'src/chat/utils/chatBoot.ts',
    "{type: 'SET_APP_STATE_VALUE', key: 'assistantMessageState', value: true}",
    false,
  ],
  [
    'src/chat/utils/chatBoot.ts',
    "{type: 'SET_APP_STATE_VALUE', key: 'catastrophicErrorType', value: true, message: {}}",
    false,
  ],
  [
    'src/chat/utils/other.ts',
    "{type: 'SET_APP_STATE_VALUE', key: 'catastrophicErrorType', value: true}",
    false,
  ],
  [
    'src/shared/services/ThemeWatcherService.ts',
    '{type: UPDATE_THEME_STATE, themeState: {}}',
    true,
  ],
  [
    'src/shared/services/ThemeWatcherService.ts',
    "{type: 'UPDATE_THEME_STATE', themeState: {}}",
    false,
  ],
  [
    'src/shared/services/ThemeWatcherService.ts',
    "{type: 'ADD_MESSAGE', message: {}}",
    false,
  ],
])(
  'allows only the exact raw state action at %s: %s',
  (file, expression, expected) => {
    const f = fixture({
      'entry.ts': `import { UPDATE_THEME_STATE } from './actions'; export const action = ${expression};`,
      'actions.ts': "export const UPDATE_THEME_STATE = 'UPDATE_THEME_STATE';",
    });
    const declaration = f.source().statements.find(ts.isVariableStatement)!
      .declarationList.declarations[0];
    expect(
      allowedRawAction(
        f.checker,
        file,
        declaration.initializer,
        f.source('actions.ts').fileName
      )
    ).toBe(expected);
  }
);

it('follows const action and private provenance wrappers without allowing raw transcript literals', () => {
  const f = fixture({
    'entry.ts':
      "import actions from './actions'; import { markHumanAgentIngress } from './ownership'; const legitimate = actions.addMessage(); const hidden = { type: 'ADD_MESSAGE' }; export const first = markHumanAgentIngress(legitimate); export const second = markHumanAgentIngress(hidden);",
    'actions.ts':
      "export default { addMessage() { return { type: 'ADD_MESSAGE' }; } };",
    'ownership.ts':
      'export function markHumanAgentIngress<T extends object>(action: T): T { return action; }',
  });
  const values = f
    .source()
    .statements.filter(ts.isVariableStatement)
    .flatMap((statement) => statement.declarationList.declarations)
    .slice(-2);
  expect(
    values.map((declaration) =>
      rawActionValue(
        f.checker,
        declaration.initializer,
        new Set([f.source('actions.ts').fileName]),
        f.source('ownership.ts').fileName
      )
    )
  ).toEqual([true, false]);
});

it('wires private reduction receipts before listeners without rereading action payloads', () => {
  const storeFile = 'src/shared/store/appStore.ts';
  const ownershipFile = 'src/shared/store/messageOwnership.ts';
  const constructors = calls.filter(
    (call) =>
      relative(call.file) === storeFile &&
      call.name === 'createStoreFromReduction'
  );
  expect(
    constructors.map((call) => relative(call.source.fileName)).sort()
  ).toEqual([storeFile, 'src/shared/store/doCreateStore.ts'].sort());
  const boot = constructors.find(
    (call) =>
      relative(call.source.fileName) === 'src/shared/store/doCreateStore.ts'
  )!;
  const reducer = boot.node.arguments![0];
  let reducerSymbol = checker.getSymbolAtLocation(reducer)!;
  if (reducerSymbol.flags & ts.SymbolFlags.Alias) {
    reducerSymbol = checker.getAliasedSymbol(reducerSymbol);
  }
  expect(
    reducerSymbol.declarations!.map((declaration) => [
      relative(declaration.getSourceFile().fileName),
      (declaration as ts.FunctionDeclaration).name?.text,
    ])
  ).toEqual([['src/shared/store/reducers.ts', 'reduceWithMessageOwnership']]);
  const storeDeclaration = boot.node.parent;
  expect(ts.isVariableDeclaration(storeDeclaration)).toBe(true);
  const enable = calls.find(
    (call) =>
      relative(call.source.fileName) === 'src/shared/store/doCreateStore.ts' &&
      relative(call.file) === ownershipFile &&
      call.name === 'enableMessageOwnership'
  )!;
  expect(checker.getSymbolAtLocation(enable.node.arguments![0])).toBe(
    checker.getSymbolAtLocation(
      (storeDeclaration as ts.VariableDeclaration).name
    )
  );
  const commits = calls.filter(
    (call) =>
      relative(call.source.fileName) === storeFile &&
      relative(call.file) === ownershipFile &&
      call.name === 'commitMessageOwnership'
  );
  expect(commits).toHaveLength(2);
  const bindings = new Map<string, ts.Symbol>();
  visit(get(storeFile), (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      ['store', 'reduction', 'currentState', 'nextState', 'listeners'].includes(
        node.name.text
      )
    ) {
      bindings.set(node.name.text, checker.getSymbolAtLocation(node.name)!);
    }
  });
  for (const commit of commits) {
    expect(commit.node.arguments).toHaveLength(3);
    const [store, receipt, action] = commit.node.arguments!;
    expect(checker.getSymbolAtLocation(store)).toBe(bindings.get('store'));
    expect(ts.isPropertyAccessExpression(receipt)).toBe(true);
    if (ts.isPropertyAccessExpression(receipt)) {
      expect(receipt.name.text).toBe('ownership');
      expect(checker.getSymbolAtLocation(receipt.expression)).toBe(
        bindings.get('reduction')
      );
    }
    const reduction = bindings.get('reduction')!
      .valueDeclaration as ts.VariableDeclaration;
    expect(ts.isCallExpression(reduction.initializer!)).toBe(true);
    expect(checker.getSymbolAtLocation(action)).toBe(
      checker.getSymbolAtLocation(
        (reduction.initializer as ts.CallExpression).arguments[1]
      )
    );
  }
  const statement = commits[0].node.parent as ts.ExpressionStatement;
  const block = statement.parent as ts.Block;
  const index = block.statements.indexOf(statement);
  const before = block.statements[index - 1] as ts.ExpressionStatement;
  expect(ts.isBinaryExpression(before.expression)).toBe(true);
  const assignment = before.expression as ts.BinaryExpression;
  expect(assignment.operatorToken.kind).toBe(ts.SyntaxKind.EqualsToken);
  expect(checker.getSymbolAtLocation(assignment.left)).toBe(
    bindings.get('currentState')
  );
  expect(checker.getSymbolAtLocation(assignment.right)).toBe(
    bindings.get('nextState')
  );
  const after = (block.statements[index + 1] as ts.ExpressionStatement)
    .expression as ts.CallExpression;
  expect(ts.isPropertyAccessExpression(after.expression)).toBe(true);
  expect(
    checker.getSymbolAtLocation(
      (after.expression as ts.PropertyAccessExpression).expression
    )
  ).toBe(bindings.get('listeners'));
  const unchangedBlock = commits[1].node.parent.parent as ts.Block;
  expect(unchangedBlock.statements).toHaveLength(1);
  expect((block.parent as ts.IfStatement).elseStatement).toBe(unchangedBlock);
});
