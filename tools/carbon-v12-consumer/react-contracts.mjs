/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from 'node:path';

function entry(root, module) {
  return `${root}/${module
    .replaceAll('\\', '/')
    .replace(/^src\//, '')
    .replace(/\.tsx?$/, '.js')}`;
}

function publicFamilies(model, wrapper) {
  const owner = path.resolve(
    model.root,
    path.dirname(wrapper.element.module),
    'index.ts'
  );
  return model.program
    .getSourceFiles()
    .filter((source) =>
      /\/src\/components\/aichat-[^/]+\/index\.ts$/.test(
        source.fileName.replaceAll('\\', '/')
      )
    )
    .sort(
      (a, b) => Number(b.fileName === owner) - Number(a.fileName === owner)
    );
}

function isBuiltin(symbol) {
  return symbol.declarations.some((declaration) =>
    /\/typescript\/lib\/lib\..*\.d\.ts$/.test(
      declaration.getSourceFile().fileName.replaceAll('\\', '/')
    )
  );
}

function publicTypeReference(model, families, symbol, root) {
  const { ts, checker } = model;
  for (const source of families) {
    const module = checker.getSymbolAtLocation(source);
    const exported =
      module &&
      checker.getExportsOfModule(module).find((item) => {
        const target =
          item.flags & ts.SymbolFlags.Alias
            ? checker.getAliasedSymbol(item)
            : item;
        return target === symbol;
      });
    if (exported) {
      return ts.factory.createImportTypeNode(
        ts.factory.createLiteralTypeNode(
          ts.factory.createStringLiteral(
            entry(root, path.relative(model.root, source.fileName))
          )
        ),
        undefined,
        ts.factory.createIdentifier(exported.name),
        undefined,
        false
      );
    }
  }
  throw new Error(`No public family export for callback type ${symbol.name}.`);
}

function typeVisitor(context, model, families, root) {
  const { ts } = model;
  function visit(node) {
    if (!ts.isTypeReferenceNode(node)) {
      return ts.visitEachChild(node, visit, context);
    }
    const symbol = model.symbol(node.typeName);
    if (!symbol) {
      throw new Error(`Unresolved callback type ${node.getText()}.`);
    }
    if (isBuiltin(symbol)) {
      return ts.factory.createTypeReferenceNode(
        symbol.name,
        node.typeArguments?.map(visit)
      );
    }
    return publicTypeReference(model, families, symbol, root);
  }
  return visit;
}

/** Compile every final wrapper export, including named families and adapters. */
function expectedEventType(model, wrapper, callback, root) {
  const { ts } = model;
  const families = publicFamilies(model, wrapper);
  const transformed = ts.transform(callback.typeNode, [
    (context) => {
      const visit = typeVisitor(context, model, families, root);
      return (node) => ts.visitNode(node, visit);
    },
  ]);
  try {
    return ts
      .createPrinter()
      .printNode(
        ts.EmitHint.Unspecified,
        transformed.transformed[0],
        callback.typeNode.getSourceFile()
      );
  } finally {
    transformed.dispose();
  }
}

export function reactContractSource(
  wrappers,
  root,
  model,
  { externalIcons = true } = {}
) {
  const contracts = wrappers.map((wrapper, index) => {
    const component = `Wrapper${index}`;
    const props = `Props${index}`;
    const callbacks = wrapper.callbacks
      .map((binding, callbackIndex) => {
        const { callback } = binding;
        const event = `Event${index}_${callbackIndex}`;
        const expected = expectedEventType(model, wrapper, binding, root);
        return `
type ${event} = Parameters<NonNullable<${props}['${callback}']>>[0];
export type Typed${event} = Assert<Equal<IsAny<${event}>, false>>;
export type Exact${event} = Assert<Equal<${event}, ${expected}>>;
export type DOM${event} = Assert<${event} extends Event ? true : false>;
export type Detail${event} = Assert<Equal<IsAny<${event} extends CustomEvent<infer Detail> ? Detail : never>, false>>;
createElement(${component}, { ${callback}: event => {
  event.preventDefault();
  // @ts-expect-error Callback parameters must retain their event contract.
  event.__notAPublicEventField;
}});
`;
      })
      .join('\n');
    return `
import { ${wrapper.exportName} as ${component} } from '${entry(root, wrapper.module)}';
import type Element${index} from '${entry(root, wrapper.element.module)}';
type ${props} = ComponentProps<typeof ${component}>;
export type TypedProps${index} = Assert<Equal<IsAny<${props}>, false>>;
export type ConcreteRef${index} = Assert<Equal<ComponentRef<typeof ${component}>, Element${index}>>;
createElement(${component}, { ref: createRef<Element${index}>() });
// @ts-expect-error Unknown props must fail for every final export.
createElement(${component}, { __notAPublicProp: true });
// @ts-expect-error Refs must point to this wrapper's concrete element.
createElement(${component}, { ref: createRef<HTMLDivElement>() });
${callbacks}
`;
  });
  return `
import { createElement, createRef, type ComponentProps, type ComponentRef } from 'react';
type IsAny<T> = 0 extends (1 & T) ? true : false;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;
${contracts.join('\n')}

${valueContractSource(root, externalIcons)}
`;
}

function valueContractSource(root, externalIcons) {
  return `
import CodeSnippet from '${root}/react/code-snippet.js';
import Toolbar from '${root}/react/toolbar.js';
import ChatHeader from '${root}/react/chat-header.js';
import Markdown from '${root}/react/markdown.js';
import PromptLine from '${root}/react/prompt-line.js';
import AutocompleteController from '${root}/react/autocomplete-controller.js';
${externalIcons ? "import { Add } from '@carbon/icons-react';" : "function Add(props: import('react').SVGProps<SVGSVGElement>) { return createElement('svg', props); }"}

type CodeBlockRenderer = NonNullable<NonNullable<ComponentProps<typeof Markdown>['customRenderers']>['codeBlock']>;
export type TypedCodeBlockArgs = Assert<Equal<IsAny<Parameters<CodeBlockRenderer>[0]>, false>>;

createElement(CodeSnippet, { language: 'typescript', actions: [{ text: 'Add', icon: Add, onClick() {} }], onChange: event => {
  const value: string = event.detail.content;
  // @ts-expect-error The content-change detail is a string, not a number.
  const wrong: number = event.detail.content;
  void value; void wrong;
}});
createElement(Toolbar, { actions: [{ text: 'Add', icon: Add, onClick() {} }] });
createElement(ChatHeader, { isRTL: true, actions: [{ text: 'Add', icon: Add, onClick() {} }], navigationBackIcon: Add, navigationOverflowIcon: Add });
createElement(Markdown, { markdown: '**typed**', customRenderers: { table: () => createElement('p', null, 'React table') } });
createElement(PromptLine, { disabled: true, placeholder: 'Ask', onChange: event => {
  const text: string = event.detail.rawValue;
  // @ts-expect-error PromptLine detail keeps its rawValue string type.
  const wrong: boolean = event.detail.rawValue;
  void text; void wrong;
}});
createElement(AutocompleteController, { onAutocompleteNavigated: event => {
  // @ts-expect-error Controller callbacks receive DOM events, not payload-only options.
  event.__notAPublicEventField;
}});
// @ts-expect-error Known value props retain their declared types through adapters.
createElement(CodeSnippet, { language: 1 });
// @ts-expect-error Toolbar action icons retain the React/Carbon icon contract.
createElement(Toolbar, { actions: [{ text: 'Add', icon: 'invalid', onClick() {} }] });
// @ts-expect-error Header actions require their declared action shape.
createElement(ChatHeader, { actions: [{ text: 1, icon: Add, onClick() {} }] });
// @ts-expect-error Header direction remains a boolean prop.
createElement(ChatHeader, { isRTL: 'yes' });
createElement(Markdown, { customRenderers: { codeBlock: args => {
  const slot: string = args.slotName;
  const code: string = args.code;
  // @ts-expect-error Markdown renderer arguments are contextually typed.
  args.__notAPublicRendererField;
  return createElement('pre', { id: slot }, code);
} } });
// @ts-expect-error Value props are no longer accepted as arbitrary values.
createElement(PromptLine, { disabled: 'yes' });
`;
}
