/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ts as typescript } from '@custom-elements-manifest/analyzer';

function stringValue(ts, node, constants, prefix, visited = new Set()) {
  if (ts.isStringLiteralLike(node)) {
    return node.text;
  }
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node)) {
    return stringValue(ts, node.expression, constants, prefix, visited);
  }
  if (ts.isIdentifier(node)) {
    if (visited.has(node.text)) {
      throw new Error(`Circular tag constant: ${node.text}`);
    }
    const initializer = constants.get(node.text);
    if (initializer) {
      return stringValue(
        ts,
        initializer,
        constants,
        prefix,
        new Set([...visited, node.text])
      );
    }
    if (node.text === 'prefix' && prefix !== undefined) {
      return prefix;
    }
  }
  if (ts.isTemplateExpression(node)) {
    return (
      node.head.text +
      node.templateSpans
        .map(
          (span) =>
            stringValue(ts, span.expression, constants, prefix, visited) +
            span.literal.text
        )
        .join('')
    );
  }
  throw new Error(`Unsupported tag expression: ${node.getText()}`);
}

function collectImportBindings(ts, statement, imports, decorators) {
  if (
    !ts.isImportDeclaration(statement) ||
    !ts.isStringLiteral(statement.moduleSpecifier)
  ) {
    return;
  }
  const module = statement.moduleSpecifier.text;
  const clause = statement.importClause;
  if (clause?.name) {
    imports.set(clause.name.text, {
      module,
      name: 'default',
      typeOnly: Boolean(clause.isTypeOnly),
    });
  }
  if (!clause?.namedBindings || !ts.isNamedImports(clause.namedBindings)) {
    return;
  }
  for (const binding of clause.namedBindings.elements) {
    const name = (binding.propertyName ?? binding.name).text;
    imports.set(binding.name.text, {
      module,
      name,
      typeOnly: Boolean(clause.isTypeOnly || binding.isTypeOnly),
    });
    if (name === 'carbonElement') {
      decorators.add(binding.name.text);
    }
  }
}

function localTypeNames(ts, source, imports) {
  const names = new Set(
    [...imports].filter(([, binding]) => binding.typeOnly).map(([name]) => name)
  );
  for (const statement of source.statements) {
    if (
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement)
    ) {
      names.add(statement.name.text);
    }
  }
  for (const statement of source.statements) {
    if (
      ts.isClassDeclaration(statement) ||
      ts.isFunctionDeclaration(statement) ||
      ts.isEnumDeclaration(statement)
    ) {
      names.delete(statement.name?.text);
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          names.delete(declaration.name.text);
        }
      }
    }
  }
  return names;
}

function typeOnlyExportNames(ts, source, names) {
  const exported = new Set();
  for (const statement of source.statements) {
    if (
      (ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement)) &&
      names.has(statement.name.text)
    ) {
      exported.add(statement.name.text);
      if (
        statement.modifiers?.some(
          (modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword
        )
      ) {
        exported.add('default');
      }
    }
    if (
      !ts.isExportDeclaration(statement) ||
      !statement.exportClause ||
      !ts.isNamedExports(statement.exportClause)
    ) {
      continue;
    }
    for (const binding of statement.exportClause.elements) {
      if (
        statement.isTypeOnly ||
        binding.isTypeOnly ||
        (!statement.moduleSpecifier &&
          names.has((binding.propertyName ?? binding.name).text))
      ) {
        exported.add(binding.name.text);
      }
    }
  }
  return exported;
}

function dynamicRegistrationNames(ts, source) {
  const names = new Set();
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText() === 'customElements' &&
      node.expression.name.text === 'define' &&
      node.arguments[0] &&
      !ts.isStringLiteralLike(node.arguments[0])
    ) {
      names.add(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return names;
}

function sourceInfo(ts, source) {
  const constants = new Map();
  const imports = new Map();
  const decorators = new Set(['carbonElement']);
  let defaultName;
  for (const statement of source.statements) {
    collectImportBindings(ts, statement, imports, decorators);
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.initializer) {
          constants.set(declaration.name.text, declaration.initializer);
        }
      }
    }
    if (
      ts.isExportAssignment(statement) &&
      ts.isIdentifier(statement.expression)
    ) {
      defaultName = statement.expression.text;
    }
    if (
      ts.isClassDeclaration(statement) &&
      statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword
      )
    ) {
      defaultName = statement.name?.text;
    }
  }
  const names = localTypeNames(ts, source, imports);
  return {
    constants,
    imports,
    decorators,
    defaultName,
    types: { names, exported: typeOnlyExportNames(ts, source, names) },
    dynamicRegistrations: dynamicRegistrationNames(ts, source),
  };
}

export function readPrefixSetting(
  settingsPath = new URL('../src/globals/settings.ts', import.meta.url)
) {
  const source = typescript.createSourceFile(
    String(settingsPath),
    readFileSync(settingsPath, 'utf8'),
    typescript.ScriptTarget.Latest,
    true
  );
  const { constants } = sourceInfo(typescript, source);
  const initializer = constants.get('prefix');
  if (!initializer) {
    throw new Error('The prefix setting must declare prefix.');
  }
  return stringValue(typescript, initializer, constants);
}

function moduleKey(module) {
  return path.posix
    .normalize(module.replaceAll('\\', '/'))
    .replace(/^\/src\//, 'src/')
    .replace(/\.[cm]?[jt]sx?$/, '');
}

function addDefinition(module, tagName, declaration) {
  module.exports ??= [];
  if (
    !module.exports.some(
      (entry) =>
        entry.kind === 'custom-element-definition' && entry.name === tagName
    )
  ) {
    module.exports.push({
      kind: 'custom-element-definition',
      name: tagName,
      declaration,
    });
  }
}

export function carbonElementTagPlugin({ prefix }) {
  const classes = [];
  const registrations = [];
  const sources = new Map();
  return {
    name: 'carbon-element-tag',
    initialize() {
      classes.length = 0;
      registrations.length = 0;
      sources.clear();
    },
    collectPhase({ ts, node }) {
      if (ts.isSourceFile(node)) {
        sources.set(moduleKey(node.fileName), sourceInfo(ts, node));
      }
    },
    analyzePhase({ ts, node, moduleDoc }) {
      const source = node.getSourceFile();
      const info = sources.get(moduleKey(source.fileName));
      if (
        ts.isExpressionStatement(node) &&
        ts.isCallExpression(node.expression)
      ) {
        const call = node.expression;
        if (
          !ts.isIdentifier(call.expression) ||
          !call.arguments[0] ||
          !ts.isIdentifier(call.arguments[0])
        ) {
          return;
        }
        const imported = info.imports.get(call.expression.text);
        if (
          call.expression.text === 'defineCustomElement' ||
          imported?.name === 'defineCustomElement'
        ) {
          registrations.push({
            module: moduleDoc.path,
            className: call.arguments[0].text,
            info,
          });
        }
      }
      if (!ts.isClassDeclaration(node) || !node.name) {
        return;
      }
      const declaration = moduleDoc.declarations?.find(
        (entry) => entry.name === node.name.text
      );
      if (!declaration) {
        return;
      }
      const abstract = node.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.AbstractKeyword
      );
      if (abstract) {
        classes.push({
          module: moduleDoc.path,
          name: node.name.text,
          abstract: true,
        });
        return;
      }
      const decorator = (ts.getDecorators(node) ?? []).find(
        (entry) =>
          ts.isCallExpression(entry.expression) &&
          ts.isIdentifier(entry.expression.expression) &&
          info.decorators.has(entry.expression.expression.text)
      );
      const staticIs = node.members.find(
        (member) =>
          member.name?.getText() === 'is' &&
          member.modifiers?.some(
            (modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword
          )
      );
      const decoratorTag =
        decorator &&
        stringValue(
          ts,
          decorator.expression.arguments[0],
          info.constants,
          prefix
        );
      const staticTag =
        staticIs?.initializer &&
        stringValue(ts, staticIs.initializer, info.constants, prefix);
      if (decoratorTag && staticTag && decoratorTag !== staticTag) {
        throw new Error(`Conflicting tag names for ${node.name.text}.`);
      }
      const tagName = decoratorTag || staticTag;
      if (!tagName) {
        return;
      }
      declaration.tagName = tagName;
      declaration.customElement = true;
      if (decorator) {
        addDefinition(moduleDoc, tagName, {
          name: node.name.text,
          module: moduleDoc.path,
        });
      }
      classes.push({
        module: moduleDoc.path,
        name: node.name.text,
        tagName,
        registered: Boolean(decorator),
      });
    },
    packageLinkPhase({ customElementsManifest }) {
      const modules = customElementsManifest.modules;
      for (const element of classes) {
        const module = modules.find(
          (entry) => moduleKey(entry.path) === moduleKey(element.module)
        );
        const declaration = module?.declarations?.find(
          (entry) => entry.name === element.name
        );
        if (!declaration) {
          continue;
        }
        if (element.abstract) {
          delete declaration.tagName;
          module.exports = module.exports?.filter(
            (entry) =>
              entry.kind !== 'custom-element-definition' ||
              entry.declaration.name !== element.name
          );
          continue;
        }
        declaration.tagName = element.tagName;
        if (element.registered) {
          module.exports = module.exports?.filter(
            (entry) =>
              entry.kind !== 'custom-element-definition' ||
              entry.declaration.name !== element.name
          );
          addDefinition(module, element.tagName, {
            name: element.name,
            module: module.path,
          });
        }
      }
      for (const registration of registrations) {
        const imported = registration.info.imports.get(registration.className);
        const sourceModule = imported?.module.startsWith('.')
          ? path.posix.join(
              path.posix.dirname(registration.module),
              imported.module
            )
          : registration.module;
        const name =
          imported?.name === 'default'
            ? sources.get(moduleKey(sourceModule))?.defaultName
            : (imported?.name ?? registration.className);
        const element = classes.find(
          (entry) =>
            moduleKey(entry.module) === moduleKey(sourceModule) &&
            entry.name === name
        );
        if (!element?.tagName || element.abstract) {
          continue;
        }
        const module = modules.find(
          (entry) => entry.path === registration.module
        );
        addDefinition(module, element.tagName, {
          name: element.name,
          module: element.module,
        });
      }
    },
  };
}

export function internalMembersPlugin() {
  return {
    name: 'internal-members',
    analyzePhase({ ts, node, moduleDoc }) {
      if (!ts.isClassDeclaration(node) || !node.name) {
        return;
      }
      const declaration = moduleDoc.declarations?.find(
        (entry) => entry.name === node.name.text
      );
      for (const member of node.members) {
        if (
          !ts
            .getJSDocTags(member)
            .some((tag) => tag.tagName.text === 'internal')
        ) {
          continue;
        }
        const field = declaration?.members?.find(
          (entry) => entry.name === member.name?.getText()
        );
        if (field) {
          field.privacy = 'private';
        }
      }
    },
  };
}

export function componentModulePathsPlugin() {
  const sources = new Map();
  const packageRoot = fileURLToPath(new URL('../', import.meta.url));
  const publishedPath = (module) => {
    // The analyzer uses /src/... as a virtual root for imported references.
    const source = module.startsWith('/src/') ? module.slice(1) : module;
    const normalized = path.posix.normalize(
      path.isAbsolute(source) ? path.relative(packageRoot, source) : source
    );
    if (!normalized.startsWith('src/')) {
      return normalized;
    }
    const published = normalized
      .replace(/^src\//, 'es/')
      .replace(/\.[jt]sx?$/, '.js');
    return path.posix.extname(published) ? published : `${published}.js`;
  };
  return {
    name: 'component-published-module-paths',
    initialize() {
      sources.clear();
    },
    collectPhase({ ts, node }) {
      if (ts.isSourceFile(node)) {
        sources.set(moduleKey(node.fileName), sourceInfo(ts, node));
      }
    },
    analyzePhase({ ts, node, moduleDoc }) {
      if (!ts.isEnumDeclaration(node)) {
        return;
      }
      // The analyzer omits enums even though their objects exist at runtime.
      moduleDoc.declarations ??= [];
      moduleDoc.declarations.push({
        kind: 'variable',
        name: node.name.text,
        type: { text: `typeof ${node.name.text}` },
      });
      if (
        !node.modifiers?.some(
          (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
        )
      ) {
        return;
      }
      moduleDoc.exports ??= [];
      moduleDoc.exports.push({
        kind: 'js',
        name: node.name.text,
        declaration: { name: node.name.text, module: moduleDoc.path },
      });
    },
    packageLinkPhase({ customElementsManifest }) {
      const modules = customElementsManifest.modules;
      const resolveDeclaration = (reference, owner, visited = new Set()) => {
        if (reference.package) {
          return reference;
        }
        const target = reference.module?.startsWith('.')
          ? path.posix.join(path.posix.dirname(owner.path), reference.module)
          : (reference.module ?? owner.path);
        const module = modules.find(
          (entry) => moduleKey(entry.path) === moduleKey(target)
        );
        if (
          !module ||
          module.declarations?.some((entry) => entry.name === reference.name)
        ) {
          return reference;
        }
        const key = `${module.path}#${reference.name}`;
        if (visited.has(key)) {
          throw new Error(`Circular manifest export: ${key}`);
        }
        const imported = sources
          .get(moduleKey(module.path))
          ?.imports.get(reference.name);
        if (!imported) {
          return reference;
        }
        if (!imported.module.startsWith('.')) {
          const segments = imported.module.split('/');
          const packageName = segments
            .splice(0, imported.module.startsWith('@') ? 2 : 1)
            .join('/');
          return {
            name: imported.name,
            package: packageName,
            ...(segments.length ? { module: segments.join('/') } : {}),
          };
        }
        const importedPath = path.posix.join(
          path.posix.dirname(module.path),
          imported.module
        );
        const importedModule = modules.find(
          (entry) => moduleKey(entry.path) === moduleKey(importedPath)
        );
        const exported = importedModule?.exports?.find(
          (entry) => entry.kind === 'js' && entry.name === imported.name
        );
        const declaration = exported?.declaration ?? {
          name:
            imported.name === 'default'
              ? (sources.get(moduleKey(importedPath))?.defaultName ?? 'default')
              : imported.name,
          module: importedModule?.path ?? importedPath,
        };
        return resolveDeclaration(
          declaration,
          importedModule ?? module,
          new Set([...visited, key])
        );
      };
      for (const module of modules) {
        const info = sources.get(moduleKey(module.path));
        module.exports = module.exports?.filter((entry) => {
          if (entry.kind === 'custom-element-definition') {
            return !info?.dynamicRegistrations.has(entry.name);
          }
          if (entry.kind !== 'js') {
            return true;
          }
          if (info?.types.exported.has(entry.name)) {
            return false;
          }
          entry.declaration = resolveDeclaration(entry.declaration, module);
          const reference = entry.declaration;
          if (reference.package) {
            return true;
          }
          const target = reference.module?.startsWith('.')
            ? path.posix.join(path.posix.dirname(module.path), reference.module)
            : (reference.module ?? module.path);
          return !sources
            .get(moduleKey(target))
            ?.types.names.has(reference.name);
        });
      }
      for (const module of customElementsManifest.modules) {
        const source = module.path;
        const rewrite = (value) => {
          if (!value || typeof value !== 'object') {
            return;
          }
          if (typeof value.module === 'string' && !value.package) {
            const target = value.module.startsWith('.')
              ? path.posix.join(path.posix.dirname(source), value.module)
              : value.module;
            value.module = publishedPath(target);
          }
          Object.values(value).forEach(rewrite);
        };
        rewrite(module);
        module.path = publishedPath(source);
      }
    },
  };
}
