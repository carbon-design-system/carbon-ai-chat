/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import path from 'node:path';
import ts from 'typescript';

const packageRoot = path.resolve(__dirname, '../../..');
const typesRoot = path.join(packageRoot, 'src/types') + path.sep;
const entry = path.join(packageRoot, 'src/serverEntry.ts');

/** The public names an SDK host starts from. */
export const SDK_ROOTS = [
  'ChatSDKConfig',
  'ChatSDKConfigMessaging',
  'ChatSDKErrorData',
  'ChatSDKEventType',
  'ChatSDKHandlers',
  'ChatSDKInstance',
  'ChatSDKInstanceMessaging',
  'ChatSDKPersistedStateConfig',
  'ChatSDKServiceDeskConfig',
  'ChatSDKState',
  'ChatSDKStateAccess',
];

export interface SDKDeclaration {
  name: string;
  file: string;
  node: ts.Declaration;
  /**
   * The type half of a paired `export const X` and `export type X`. Its JSDoc sits on the const, and
   * TypeDoc lists both halves from there.
   */
  pairedType: boolean;
}

function resolve(checker: ts.TypeChecker, symbol: ts.Symbol) {
  return symbol.flags & ts.SymbolFlags.Alias
    ? checker.getAliasedSymbol(symbol)
    : symbol;
}

function referencedSymbol(
  checker: ts.TypeChecker,
  node: ts.TypeReferenceNode | ts.ExpressionWithTypeArguments
) {
  const name = ts.isTypeReferenceNode(node) ? node.typeName : node.expression;
  return checker.getSymbolAtLocation(
    ts.isQualifiedName(name) ? name.right : name
  );
}

/** The defaults of the type parameters a reference with `given` arguments leaves out. */
function omittedDefaults(
  checker: ts.TypeChecker,
  symbol: ts.Symbol | undefined,
  given: number
) {
  if (!symbol) {
    return [];
  }
  return (resolve(checker, symbol).declarations ?? []).flatMap((declaration) =>
    ts
      .getEffectiveTypeParameterDeclarations(
        declaration as ts.DeclarationWithTypeParameters
      )
      .slice(given)
      .flatMap((parameter) => (parameter.default ? [parameter.default] : []))
  );
}

/**
 * Every type an SDK host can reach from {@link SDK_ROOTS}, plus the payloads of the events in
 * `ChatSDKEventType`. The walk follows type references through members, heritage clauses, and type
 * arguments. It follows a type-parameter default only where a reference leaves that argument out:
 * `TypeAndHandler<I = ChatInstance>` reaches `ChatInstance` only when a reference omits `I`, which
 * the SDK's references never do, while `EventInput` with no argument reaches its default
 * `EventInputData`. Returns the reachable declarations that the root entry exports.
 */
export function sdkSurface() {
  const program = ts.createProgram([entry], {
    target: ts.ScriptTarget.ES2021,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.React,
    experimentalDecorators: true,
    skipLibCheck: true,
    noEmit: true,
  });
  const checker = program.getTypeChecker();
  const exported = new Map<ts.Symbol, string>();
  for (const symbol of checker.getExportsOfModule(
    checker.getSymbolAtLocation(program.getSourceFile(entry)!)!
  )) {
    exported.set(resolve(checker, symbol), symbol.name);
  }
  const roots = [...exported].filter(([, name]) => SDK_ROOTS.includes(name));
  const seen = new Set<ts.Symbol>();
  const reached: SDKDeclaration[] = [];
  const queue: ts.Symbol[] = roots.map(([symbol]) => symbol);
  const sdkEvents = new Set<ts.Symbol>();

  const enqueue = (symbol: ts.Symbol | undefined) => {
    if (!symbol) {
      return;
    }
    let target = resolve(checker, symbol);
    if (target.flags & ts.SymbolFlags.EnumMember) {
      const declaration = target.declarations![0].parent as ts.EnumDeclaration;
      target = checker.getSymbolAtLocation(declaration.name)!;
    }
    if (!seen.has(target)) {
      queue.push(target);
    }
  };
  const visit = (node: ts.Node, owner: ts.Symbol) => {
    if (ts.isTypeParameterDeclaration(node)) {
      // A reference that omits this argument visits the default instead; see below.
      if (node.constraint) {
        visit(node.constraint, owner);
      }
      return;
    }
    if (
      ts.isTypeReferenceNode(node) ||
      ts.isExpressionWithTypeArguments(node)
    ) {
      const symbol = referencedSymbol(checker, node);
      enqueue(symbol);
      for (const fallback of omittedDefaults(
        checker,
        symbol,
        node.typeArguments?.length ?? 0
      )) {
        visit(fallback, owner);
      }
      if (owner.name === 'ChatSDKEventType' && symbol) {
        sdkEvents.add(resolve(checker, symbol));
      }
    } else if (ts.isTypeQueryNode(node)) {
      enqueue(checker.getSymbolAtLocation(node.exprName));
    }
    ts.forEachChild(node, (child) => visit(child, owner));
  };

  const drain = () => {
    while (queue.length) {
      const symbol = queue.shift()!;
      if (seen.has(symbol)) {
        continue;
      }
      seen.add(symbol);
      const declarations = (symbol.declarations ?? []).filter((node) =>
        path.resolve(node.getSourceFile().fileName).startsWith(typesRoot)
      );
      for (const node of declarations) {
        if (exported.has(symbol)) {
          reached.push({
            name: exported.get(symbol)!,
            file: path.relative(packageRoot, node.getSourceFile().fileName),
            node,
            pairedType:
              ts.isTypeAliasDeclaration(node) &&
              (symbol.declarations ?? []).some(ts.isVariableDeclaration),
          });
        }
        visit(node, symbol);
      }
    }
  };
  drain();

  // The payload interfaces of the SDK's events are what its handlers receive.
  const eventSource = program.getSourceFile(
    path.join(typesRoot, 'events/eventBusTypes.ts')
  )!;
  for (const statement of eventSource.statements) {
    if (!ts.isInterfaceDeclaration(statement)) {
      continue;
    }
    const type = statement.members.find(
      (member) =>
        ts.isPropertySignature(member) &&
        member.name.getText() === 'type' &&
        member.type &&
        ts.isTypeReferenceNode(member.type)
    ) as ts.PropertySignature | undefined;
    const reference = type?.type as ts.TypeReferenceNode | undefined;
    const member =
      reference &&
      checker.getSymbolAtLocation(
        ts.isQualifiedName(reference.typeName)
          ? reference.typeName.right
          : reference.typeName
      );
    if (member && sdkEvents.has(resolve(checker, member))) {
      enqueue(checker.getSymbolAtLocation(statement.name));
    }
  }
  drain();

  return reached;
}

/** The `@category` values in a declaration's JSDoc. */
export function categories(node: ts.Node) {
  const host = ts.isVariableDeclaration(node) ? node.parent.parent : node;
  return ts
    .getJSDocTags(host)
    .filter((tag) => tag.tagName.text === 'category')
    .map((tag) => ts.getTextOfJSDocComment(tag.comment)?.trim());
}
