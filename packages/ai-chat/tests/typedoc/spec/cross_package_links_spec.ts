/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Unit tests for the cross-package reference resolver
 * (docs/typedoc/crossPackageLinksCore.js).
 *
 * A public type declared in `@carbon/ai-chat-components` reaches this package's
 * docs through a local re-declaration, which is transparent to the type
 * checker — so TypeDoc resolves the reference to the upstream declaration and
 * renders the name as plain text beside the page built for it. The core
 * re-points those references at the local reflection and reports the ones with
 * no local page, which the plugin turns into a build error.
 *
 * `typedoc` is mocked to a minimal surface (the reflection classes the walk
 * does `instanceof` checks against, `ReflectionKind` values, and a stand-in
 * `makeRecursiveVisitor`) so the resolution rules are exercised against a
 * fixture rather than a full docs build — the same approach as
 * api_index_spec.ts.
 */

jest.mock('typedoc', () => {
  const ReflectionKind: Record<string, number> = {
    Project: 0x1,
    Module: 0x2,
    Enum: 0x8,
    Variable: 0x20,
    Function: 0x40,
    Interface: 0x100,
    Property: 0x400,
    CallSignature: 0x1000,
    Parameter: 0x8000,
    TypeAlias: 0x200000,
  };
  ReflectionKind.SomeType = ReflectionKind.Interface | ReflectionKind.TypeAlias;
  ReflectionKind.SomeExport =
    ReflectionKind.SomeType |
    ReflectionKind.Enum |
    ReflectionKind.Variable |
    ReflectionKind.Function;
  ReflectionKind.TypeReferenceTarget =
    ReflectionKind.SomeType | ReflectionKind.Enum;
  ReflectionKind.ValueReferenceTarget =
    ReflectionKind.Variable | ReflectionKind.Function;

  let nextId = 1;

  class Reflection {
    id: number;
    kind: number;
    name: string;
    parent: any = null;

    constructor(kind: number, name: string) {
      this.id = nextId++;
      this.kind = kind;
      this.name = name;
    }

    kindOf(mask: number) {
      return (this.kind & mask) !== 0;
    }

    isProject() {
      return this.kind === ReflectionKind.Project;
    }

    /**
     * Mirrors TypeDoc's rule in models.js: walk up until the parent is the
     * project, and let a call signature borrow its owner's name. The residue
     * error quotes this, so a shortcut here would let the spec assert a string
     * the real build never prints.
     */
    getFriendlyFullName(): string {
      if (this.parent && !this.parent.isProject()) {
        if (this.kindOf(ReflectionKind.CallSignature)) {
          return this.parent.getFriendlyFullName();
        }
        return `${this.parent.getFriendlyFullName()}.${this.name}`;
      }
      return this.name;
    }
  }

  class ContainerReflection extends Reflection {
    children: any[] = [];
  }

  class DeclarationReflection extends ContainerReflection {
    type: any;
    typeParameters: any;
    signatures: any;
    indexSignatures: any;
    getSignature: any;
    setSignature: any;
    overwrites: any;
    implementedTypes: any;
  }

  class SignatureReflection extends Reflection {
    parameters: any;
    typeParameters: any;
    type: any;
    overwrites: any;
  }

  class ParameterReflection extends Reflection {
    type: any;
  }

  class TypeParameterReflection extends Reflection {
    type: any;
    default: any;
  }

  /**
   * Stand-in for TypeDoc's recursive type visitor: dispatch on the type's own
   * kind, then descend into the containers our fixtures use.
   */
  const makeRecursiveVisitor = (visitors: any) => {
    const visitor: any = {
      reference(type: any) {
        visitors.reference?.(type);
        for (const argument of type.typeArguments ?? []) {
          argument.visit(visitor);
        }
      },
      reflection(type: any) {
        visitors.reflection?.(type);
      },
      array(type: any) {
        type.elementType?.visit(visitor);
      },
      union(type: any) {
        for (const member of type.types ?? []) {
          member.visit(visitor);
        }
      },
      intrinsic() {},
    };
    return visitor;
  };

  return {
    Reflection,
    ContainerReflection,
    DeclarationReflection,
    SignatureReflection,
    ParameterReflection,
    TypeParameterReflection,
    ReflectionKind,
    makeRecursiveVisitor,
    Converter: { EVENT_RESOLVE_END: 'resolveEnd' },
  };
});

// Pulled through `requireMock` rather than imported: `typedoc`'s type
// declarations sit behind an `exports` map that the tests' classic `node`
// module resolution does not read, so a real import fails to typecheck.
const {
  ContainerReflection,
  DeclarationReflection,
  ParameterReflection,
  ReflectionKind,
  SignatureReflection,
}: any = jest.requireMock('typedoc');

import {
  collectModuleExports,
  discoverReferenceTypes,
  repointCrossPackageReferences,
} from '../../../docs/typedoc/crossPackageLinksCore';
import { load } from '../../../docs/typedoc/crossPackageLinksPlugin';

const CARBON = '@carbon/ai-chat-components';
const UPSTREAM = 'es/upstream.d.ts';

interface RefOptions {
  qualifiedName?: string;
  package?: string;
  preferValues?: boolean;
  packagePath?: string;
  externalUrl?: string;
  intentionallyBroken?: boolean;
  /** Simulate a TypeDoc release that renamed `_target`: the write never lands. */
  unwritable?: boolean;
}

/** An unresolved `ReferenceType`, mirroring the fields the core reads. */
function ref(name: string, options: RefOptions = {}): any {
  const qualifiedName = options.qualifiedName ?? name;
  const pkg = options.package ?? CARBON;
  const type: any = {
    type: 'reference',
    name,
    qualifiedName,
    package: pkg,
    preferValues: options.preferValues ?? false,
    externalUrl: options.externalUrl,
    _target: {
      packageName: pkg,
      packagePath: options.packagePath ?? UPSTREAM,
    },
    get symbolId() {
      return typeof this._target === 'object' ? this._target : undefined;
    },
    get reflection() {
      if (options.unwritable) {
        return undefined;
      }
      return typeof this._target === 'number'
        ? registry.get(this._target)
        : undefined;
    },
    isIntentionallyBroken() {
      return options.intentionallyBroken === true;
    },
    visit(visitor: any) {
      visitor.reference?.(this);
    },
  };
  return type;
}

const array = (elementType: any): any => ({
  type: 'array',
  elementType,
  visit(visitor: any) {
    visitor.array?.(this);
  },
});

const union = (...types: any[]): any => ({
  type: 'union',
  types,
  visit(visitor: any) {
    visitor.union?.(this);
  },
});

const intrinsic = (name: string): any => ({
  type: 'intrinsic',
  name,
  visit(visitor: any) {
    visitor.intrinsic?.(this);
  },
});

/** Every reflection built for the current fixture, by id. */
let registry: Map<number, any>;

function declaration(kind: number, name: string, type?: any): any {
  const reflection: any = new (DeclarationReflection as any)(kind, name);
  reflection.type = type;
  registry.set(reflection.id, reflection);
  return reflection;
}

function signature(name: string, parameters: any[], returnType?: any): any {
  const reflection: any = new SignatureReflection(
    ReflectionKind.CallSignature,
    name
  );
  reflection.parameters = parameters;
  reflection.type = returnType;
  for (const param of parameters) {
    param.parent = reflection;
  }
  registry.set(reflection.id, reflection);
  return reflection;
}

function parameter(name: string, type: any): any {
  const reflection: any = new ParameterReflection(
    ReflectionKind.Parameter,
    name
  );
  reflection.type = type;
  registry.set(reflection.id, reflection);
  return reflection;
}

function adopt(parent: any, ...children: any[]) {
  for (const child of children) {
    child.parent = parent;
    parent.children.push(child);
  }
  return parent;
}

class FixtureProject extends (ContainerReflection as any) {
  constructor() {
    super((ReflectionKind as any).Project, 'fixture');
  }

  private all(): any[] {
    const out: any[] = [];
    const walk = (reflection: any) => {
      out.push(reflection);
      for (const child of reflection.children ?? []) {
        walk(child);
      }
    };
    for (const child of (this as any).children) {
      walk(child);
    }
    return out;
  }

  getReflectionsByKind(mask: number) {
    return this.all().filter((reflection) => (reflection.kind & mask) !== 0);
  }

  symbolIdHasBeenRemoved() {
    return false;
  }
}

interface Fixture {
  project: any;
  refs: Record<string, any>;
  targets: Record<string, any>;
  /** What the plugin's source scan would report for this fixture. */
  reDeclared: Set<string>;
}

/**
 * A miniature of the real project: an entry module holding the local
 * re-declarations, plus the interfaces whose members reach them.
 */
function buildFixture(options: { unwritable?: boolean } = {}): Fixture {
  registry = new Map();
  const K = ReflectionKind as any;

  // Two decoys, registered before the real `TokenTree` so a first-wins match
  // over every reflection in the project would pick one of them.
  const decoyHolder = declaration(K.Interface, 'Decoy');
  const decoyProperty = declaration(K.Property, 'TokenTree');
  const decoyNested = declaration(K.Interface, 'TokenTree');
  adopt(decoyHolder, decoyProperty, decoyNested);

  const startersConfig = declaration(K.Interface, 'StartersConfig');
  const tokenTree = declaration(K.Interface, 'TokenTree');
  const buildConfig = declaration(K.Interface, 'BuildCarbonExtensionsConfig');
  const toolbarAction = declaration(K.Interface, 'ToolbarAction');
  // A real local type that merely shares a name with an upstream one. Linking
  // to it would be worse than the plain text we started with.
  const localAction = declaration(K.Interface, 'Action');
  // Shares a name with the `@tiptap/core` reference below, so the package guard
  // has to be what keeps that one external — not the absence of a match.
  const localEditor = declaration(K.Interface, 'Editor');

  // Enum surfaced as the `export const X` + `export type X` pair, so one name
  // resolves to two module exports rendering as two pages.
  const fileStatusVariable = declaration(
    K.Variable,
    'FileStatusValue',
    ref('FileStatusValue')
  );
  const fileStatusType = declaration(
    K.TypeAlias,
    'FileStatusValue',
    ref('_FileStatusValue', { qualifiedName: 'FileStatusValue' })
  );

  // Non-object-shaped alias: renders its own right-hand side.
  const markdownItPlugin = declaration(
    K.TypeAlias,
    'MarkdownItPlugin',
    ref('_MarkdownItPlugin', { qualifiedName: 'MarkdownItPlugin' })
  );

  const refs = {
    starters: ref('StartersConfig', { unwritable: options.unwritable }),
    editor: ref('Editor', { package: '@tiptap/core' }),
    tokens: ref('TokenTree'),
    missing: ref('TableCellData'),
    collision: ref('Action'),
    // One re-declared name arriving from two upstream files.
    ambiguousA: ref('ToolbarAction'),
    ambiguousB: ref('ToolbarAction', { packagePath: 'es/other.d.ts' }),
    // Reached past the local alias to the upstream symbol.
    bypassed: ref('_StartersConfig', { qualifiedName: 'StartersConfig' }),
    broken: ref('StartersConfig', { intentionallyBroken: true }),
    external: ref('TokenTree', {
      externalUrl: 'https://example.com/TokenTree',
    }),
    unionMember: ref('StartersConfig'),
    status: ref('FileStatusValue'),
    statusValue: ref('FileStatusValue', { preferValues: true }),
    configs: ref('BuildCarbonExtensionsConfig'),
    returned: ref('TokenTree'),
  };

  const inputConfig = declaration(K.Interface, 'InputConfig');
  adopt(
    inputConfig,
    declaration(K.Property, 'starters', refs.starters),
    declaration(K.Property, 'editor', refs.editor),
    declaration(K.Property, 'tokens', array(refs.tokens)),
    declaration(K.Property, 'missing', refs.missing),
    declaration(K.Property, 'collision', refs.collision),
    declaration(K.Property, 'ambiguousA', refs.ambiguousA),
    declaration(K.Property, 'ambiguousB', refs.ambiguousB),
    declaration(K.Property, 'bypassed', refs.bypassed),
    declaration(K.Property, 'broken', refs.broken),
    declaration(K.Property, 'external', refs.external),
    declaration(
      K.Property,
      'mixed',
      union(refs.unionMember, intrinsic('string'))
    ),
    declaration(K.Property, 'text', intrinsic('string'))
  );

  const fileUpload = declaration(K.Interface, 'FileUpload');
  adopt(fileUpload, declaration(K.Property, 'status', refs.status));

  const statusHolder = declaration(
    K.Variable,
    'currentStatus',
    refs.statusValue
  );

  // The path three of this issue's six types travel: a function parameter,
  // reachable only by descending through signatures.
  const builder = declaration(K.Function, 'buildCarbonExtensions');
  builder.signatures = [
    signature(
      'buildCarbonExtensions',
      [parameter('configs', refs.configs)],
      array(refs.returned)
    ),
  ];
  for (const sig of builder.signatures) {
    sig.parent = builder;
  }

  const module = declaration(K.Module, 'Type reference');
  adopt(
    module,
    decoyHolder,
    startersConfig,
    tokenTree,
    buildConfig,
    toolbarAction,
    localAction,
    localEditor,
    fileStatusVariable,
    fileStatusType,
    markdownItPlugin,
    inputConfig,
    fileUpload,
    statusHolder,
    builder
  );

  const project: any = new FixtureProject();
  adopt(project, module);

  return {
    project,
    refs,
    reDeclared: new Set([
      'StartersConfig',
      'TokenTree',
      'BuildCarbonExtensionsConfig',
      'ToolbarAction',
      'FileStatusValue',
      'MarkdownItPlugin',
    ]),
    targets: {
      startersConfig,
      tokenTree,
      buildConfig,
      toolbarAction,
      localAction,
      localEditor,
      decoyProperty,
      decoyNested,
      fileStatusVariable,
      fileStatusType,
      markdownItPlugin,
    },
  };
}

describe('discoverReferenceTypes', () => {
  it('reaches references through members, arrays, unions and signatures', () => {
    const { project, refs } = buildFixture();
    const found = discoverReferenceTypes(project).map(({ type }) => type);

    expect(found).toContain(refs.starters); // property type
    expect(found).toContain(refs.tokens); // array element
    expect(found).toContain(refs.unionMember); // union member
    expect(found).toContain(refs.configs); // signature parameter
    expect(found).toContain(refs.returned); // signature return type
  });

  it('pairs each reference with the reflection that reaches it', () => {
    const { project, refs } = buildFixture();
    const owners = new Map(
      discoverReferenceTypes(project).map(({ type, owner }) => [type, owner])
    );

    expect(owners.get(refs.missing)?.getFriendlyFullName()).toBe(
      'Type reference.InputConfig.missing'
    );
    expect(owners.get(refs.configs)?.getFriendlyFullName()).toBe(
      'Type reference.buildCarbonExtensions.configs'
    );
  });
});

describe('collectModuleExports', () => {
  it('indexes module-level exports by name', () => {
    const { project, targets } = buildFixture();
    const exports = collectModuleExports(project);

    expect(exports.get('StartersConfig')).toEqual([targets.startersConfig]);
  });

  it('excludes reflections that are not module-level exports', () => {
    const { project, targets } = buildFixture();
    const exports = collectModuleExports(project);

    // The property and the nested interface both share the exported name.
    expect(exports.get('TokenTree')).toEqual([targets.tokenTree]);
    expect(exports.get('TokenTree')).not.toContain(targets.decoyProperty);
    expect(exports.get('TokenTree')).not.toContain(targets.decoyNested);
  });

  it('keeps both halves of an export const + export type pair', () => {
    const { project, targets } = buildFixture();
    const exports = collectModuleExports(project);

    expect(exports.get('FileStatusValue')).toEqual([
      targets.fileStatusVariable,
      targets.fileStatusType,
    ]);
  });
});

describe('repointCrossPackageReferences', () => {
  it('re-points a reference at its local re-declaration', () => {
    const { project, refs, targets, reDeclared } = buildFixture();
    const result = repointCrossPackageReferences(project, reDeclared);

    expect(refs.starters.reflection).toBe(targets.startersConfig);
    expect(result.fixed).toBeGreaterThan(0);
    expect(result.failures).toEqual([]);
  });

  it('re-points a reference reached through a signature parameter', () => {
    const { project, refs, targets, reDeclared } = buildFixture();
    repointCrossPackageReferences(project, reDeclared);

    // Three of the six types this plugin exists for — BuildCarbonExtensionsConfig,
    // ExcludedTrigger, RenderTokenChipArgs — are reached only this way.
    expect(refs.configs.reflection).toBe(targets.buildConfig);
    expect(refs.returned.reflection).toBe(targets.tokenTree);
  });

  it('re-points a reference inside a union', () => {
    const { project, refs, targets, reDeclared } = buildFixture();
    repointCrossPackageReferences(project, reDeclared);

    expect(refs.unionMember.reflection).toBe(targets.startersConfig);
  });

  it('leaves third-party references alone even when the name is taken', () => {
    const { project, refs, targets, reDeclared } = buildFixture();
    const result = repointCrossPackageReferences(project, reDeclared);

    // A local `Editor` export exists, so only the package check keeps this
    // `@tiptap/core` reference external. Inventing a link would 404.
    expect(targets.localEditor).toBeDefined();
    expect(refs.editor.reflection).toBeUndefined();
    expect(typeof refs.editor._target).toBe('object');
    expect(
      result.residue.map((entry: any) => entry.qualifiedName)
    ).not.toContain('Editor');
  });

  it('leaves an intentionally broken reference alone', () => {
    const { project, refs, reDeclared } = buildFixture();
    const result = repointCrossPackageReferences(project, reDeclared);

    // Type parameters and mapped types resolve to nothing on purpose.
    expect(refs.broken.reflection).toBeUndefined();
    expect(result.residue.map((entry: any) => entry.owner)).not.toContain(
      'Type reference.InputConfig.broken'
    );
  });

  it('leaves a reference that already carries an external URL alone', () => {
    const { project, refs, reDeclared } = buildFixture();
    const result = repointCrossPackageReferences(project, reDeclared);

    expect(refs.external.reflection).toBeUndefined();
    expect(refs.external.externalUrl).toBe('https://example.com/TokenTree');
    expect(result.residue.map((entry: any) => entry.owner)).not.toContain(
      'Type reference.InputConfig.external'
    );
  });

  it('does not let a same-named property or nested type win', () => {
    const { project, refs, targets, reDeclared } = buildFixture();
    repointCrossPackageReferences(project, reDeclared);

    expect(refs.tokens.reflection).toBe(targets.tokenTree);
  });

  it('prefers the type half of an enum pair in a type position', () => {
    const { project, refs, targets, reDeclared } = buildFixture();
    repointCrossPackageReferences(project, reDeclared);

    expect(refs.status.reflection).toBe(targets.fileStatusType);
  });

  it('prefers the value half when the reference prefers values', () => {
    const { project, refs, targets, reDeclared } = buildFixture();
    repointCrossPackageReferences(project, reDeclared);

    expect(refs.statusValue.reflection).toBe(targets.fileStatusVariable);
  });

  it('skips a self-reference without counting it as residue', () => {
    const { project, targets, reDeclared } = buildFixture();
    const result = repointCrossPackageReferences(project, reDeclared);

    // `export type MarkdownItPlugin = _MarkdownItPlugin` renders its own
    // right-hand side; re-pointing it would link the page to itself.
    expect(targets.markdownItPlugin.type.reflection).toBeUndefined();
    expect(result.skipped).toBe(3);
    expect(
      result.residue.map((entry: any) => entry.qualifiedName)
    ).not.toContain('MarkdownItPlugin');
  });

  it('reports an unmatched cross-package type as residue', () => {
    const { project, reDeclared } = buildFixture();
    const result = repointCrossPackageReferences(project, reDeclared);

    expect(
      result.residue.find(
        (entry: any) => entry.owner === 'Type reference.InputConfig.missing'
      )
    ).toEqual({
      name: 'TableCellData',
      qualifiedName: 'TableCellData',
      source: `${CARBON}/${UPSTREAM}`,
      owner: 'Type reference.InputConfig.missing',
      reason: 'missing',
    });
  });

  it('does not link an unrelated local export that shares a name', () => {
    const { project, refs, targets, reDeclared } = buildFixture();
    const result = repointCrossPackageReferences(project, reDeclared);

    // `Action` is exported locally but is not a re-declaration of the upstream
    // `Action`, so a name match alone must not produce a link.
    expect(targets.localAction).toBeDefined();
    expect(refs.collision.reflection).toBeUndefined();
    expect(
      result.residue.find((entry: any) => entry.qualifiedName === 'Action')
        ?.reason
    ).toBe('missing');
  });

  it('refuses to guess when one name comes from two upstream files', () => {
    const { project, refs, reDeclared } = buildFixture();
    const result = repointCrossPackageReferences(project, reDeclared);

    // `ToolbarAction` is re-declared locally, but only one upstream file can
    // own that page and nothing here can tell which.
    expect(refs.ambiguousA.reflection).toBeUndefined();
    expect(refs.ambiguousB.reflection).toBeUndefined();
    const reported = result.residue.filter(
      (entry: any) => entry.qualifiedName === 'ToolbarAction'
    );
    expect(reported.map((entry: any) => entry.source).sort()).toEqual([
      `${CARBON}/es/other.d.ts`,
      `${CARBON}/${UPSTREAM}`,
    ]);
    expect(reported.every((entry: any) => entry.reason === 'ambiguous')).toBe(
      true
    );
  });

  it('flags residue whose local alias exists but was bypassed', () => {
    const { project, reDeclared } = buildFixture();
    const result = repointCrossPackageReferences(project, reDeclared);

    const bypassed = result.residue.find(
      (entry: any) => entry.owner === 'Type reference.InputConfig.bypassed'
    );
    expect(bypassed?.reason).toBe('bypassed');
  });

  it('reports a re-point that did not take effect', () => {
    const { project, reDeclared } = buildFixture({ unwritable: true });
    const result = repointCrossPackageReferences(project, reDeclared);

    // Guards the unsupported `_target` write: a TypeDoc release that renames
    // the field must fail loudly instead of silently unlinking the site.
    expect(result.failures.map((entry: any) => entry.qualifiedName)).toEqual([
      'StartersConfig',
    ]);
  });
});

describe('crossPackageLinksPlugin', () => {
  function run(project: any, reDeclaredNames: Set<string>) {
    const handlers: Record<string, any> = {};
    const app = {
      converter: {
        on: (event: string, handler: any) => {
          handlers[event] = handler;
        },
      },
      logger: { info: jest.fn(), error: jest.fn() },
    };
    load(app as any, { reDeclaredNames });
    handlers.resolveEnd({ project });
    return app;
  }

  it('raises an error for every residue entry', () => {
    const { project, reDeclared } = buildFixture();
    const app = run(project, reDeclared);

    // `logger.error` is what trips the build. A `validationWarning` raised
    // during conversion is sampled into the pre-validation warning count and
    // would leave the build green — see demoteValidationWarningsPlugin.js.
    const messages = app.logger.error.mock.calls.map((call: any[]) => call[0]);
    // TableCellData, Action, ToolbarAction from two upstream files, and the
    // bypassed StartersConfig.
    expect(messages).toHaveLength(5);
    expect(messages.join('\n')).toContain('TableCellData');
  });

  it('tells a bypassed alias to import the local one instead', () => {
    const { project, reDeclared } = buildFixture();
    const app = run(project, reDeclared);

    const messages = app.logger.error.mock.calls.map((call: any[]) => call[0]);
    expect(
      messages.find((message: string) =>
        message.includes('InputConfig.bypassed')
      )
    ).toContain('Import the local re-declaration');
    expect(
      messages.find((message: string) =>
        message.includes('InputConfig.missing')
      )
    ).toContain('Add a local re-declaration');
  });

  it('raises an error when a re-point does not take effect', () => {
    const { project, reDeclared } = buildFixture({ unwritable: true });
    const app = run(project, reDeclared);

    const messages = app.logger.error.mock.calls.map((call: any[]) => call[0]);
    expect(
      messages.find((message: string) => message.includes('failed to re-point'))
    ).toContain('StartersConfig');
  });

  it('reports the re-pointed count', () => {
    const { project, reDeclared } = buildFixture();
    const app = run(project, reDeclared);

    expect(app.logger.info).toHaveBeenCalledTimes(1);
    expect(app.logger.info.mock.calls[0][0]).toContain('re-pointed');
  });
});
