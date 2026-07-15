/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Unit tests for the API symbol-index extractor and serializers
 * (docs/typedoc/apiIndex*.js). `typedoc` is mocked to a minimal surface
 * (ReflectionKind values + Comment.combineDisplayParts) so the test exercises
 * our logic in isolation, without booting the TypeDoc engine. The fixture below
 * stands in for a resolved project + router.
 */

jest.mock("typedoc", () => {
  const ReflectionKind: Record<string, any> = {
    Project: 0x1,
    Module: 0x2,
    Namespace: 0x4,
    Enum: 0x8,
    EnumMember: 0x10,
    Variable: 0x20,
    Function: 0x40,
    Class: 0x80,
    Interface: 0x100,
    Property: 0x400,
    Method: 0x800,
    Accessor: 0x40000,
    TypeAlias: 0x200000,
    Reference: 0x400000,
  };
  for (const [name, value] of Object.entries({ ...ReflectionKind })) {
    ReflectionKind[value] = name;
  }
  const Comment = {
    combineDisplayParts: (parts: any[]) =>
      (parts ?? [])
        .map((p) =>
          p.kind === "inline-tag" ? `{${p.tag} ${p.text}}` : (p.text ?? ""),
        )
        .join(""),
  };
  return { ReflectionKind, Comment };
});

import { extractRecords } from "../../../docs/typedoc/apiIndexCore";
import { serializeJsonIndex } from "../../../docs/typedoc/apiIndexJson";
import { serializeMarkdown } from "../../../docs/typedoc/apiIndexMarkdown";

const K = {
  Module: 0x2,
  Enum: 0x8,
  EnumMember: 0x10,
  Function: 0x40,
  Interface: 0x100,
  Property: 0x400,
  Reference: 0x400000,
};

const META = {
  version: "v1.0.0",
  baseUrl: "https://example.com/docs/",
  generator: "test",
};

const type = (s: string) => ({ toString: () => s });
const text = (s: string) => ({ kind: "text", text: s });
const link = (target: string) => ({
  kind: "inline-tag",
  tag: "@link",
  text: target,
});

function makeComment(o: any = {}): any {
  const blockTags: any[] = [];
  if (o.category) {
    blockTags.push({ tag: "@category", content: [text(o.category)] });
  }
  if (o.deprecated !== undefined) {
    blockTags.push({ tag: "@deprecated", content: [text(o.deprecated)] });
  }
  for (const example of o.examples ?? []) {
    blockTags.push({
      tag: "@example",
      content: [{ kind: "code", text: example }],
    });
  }
  const modifiers = new Set<string>(o.modifiers ?? []);
  return {
    summary: o.summary ?? [],
    blockTags,
    getTag: (t: string) => blockTags.find((b) => b.tag === t),
    hasModifier: (m: string) => modifiers.has(m),
  };
}

function makeRefl(o: any): any {
  const refl: any = {
    kind: o.kind,
    name: o.name,
    parent: null,
    comment: o.comment,
    children: o.children ?? [],
    signatures: o.signatures,
    getSignature: o.getSignature,
    flags: o.flags ?? {},
    type: o.type,
    isReference: () => o.isReference === true,
    isDeprecated: () => Boolean(o.comment?.getTag?.("@deprecated")),
  };
  for (const child of refl.children) {
    child.parent = refl;
  }
  return refl;
}

function buildFixture() {
  const id = makeRefl({
    kind: K.Property,
    name: "id",
    type: type("string"),
    comment: makeComment({ summary: [text("The widget id.")] }),
  });
  const label = makeRefl({
    kind: K.Property,
    name: "label",
    flags: { isOptional: true },
    type: type("string"),
    comment: makeComment({ deprecated: "Use id instead." }),
  });
  const widget = makeRefl({
    kind: K.Interface,
    name: "Widget",
    comment: makeComment({
      category: "Config",
      summary: [text("A widget. See "), link("Color"), text(".")],
    }),
    children: [id, label],
  });

  const red = makeRefl({
    kind: K.EnumMember,
    name: "RED",
    type: type('"red"'),
    comment: makeComment({ summary: [text("Red.")] }),
  });
  const blue = makeRefl({
    kind: K.EnumMember,
    name: "BLUE",
    type: type('"blue"'),
  });
  const color = makeRefl({
    kind: K.Enum,
    name: "Color",
    comment: makeComment({ category: "Theme" }),
    children: [red, blue],
  });

  const make = makeRefl({
    kind: K.Function,
    name: "make",
    signatures: [
      {
        parameters: [{ name: "n", type: type("number"), flags: {} }],
        type: type("Widget"),
        comment: makeComment({
          category: "Utilities",
          summary: [text("Make a widget.")],
          examples: ["const w = make(1);"],
        }),
      },
    ],
  });

  const beta = makeRefl({
    kind: K.Interface,
    name: "Beta",
    comment: makeComment({ category: "Config", modifiers: ["@experimental"] }),
  });

  // @internal — must be skipped.
  const secret = makeRefl({
    kind: K.Interface,
    name: "Secret",
    comment: makeComment({ category: "Config", modifiers: ["@internal"] }),
  });

  // Re-export reference — must be skipped.
  const reexport = makeRefl({
    kind: K.Reference,
    name: "ReExported",
    isReference: true,
  });

  const module = makeRefl({
    kind: K.Module,
    name: "Type reference",
    children: [widget, color, make, beta, secret, reexport],
  });
  const project = { children: [module], kind: 0x1 };

  const urls = new Map<any, string>([
    [widget, "interfaces/Type_reference.Widget.html"],
    [id, "interfaces/Type_reference.Widget.html#id"],
    [label, "interfaces/Type_reference.Widget.html#label"],
    [color, "enums/Type_reference.Color.html"],
    [red, "enums/Type_reference.Color.html#RED"],
    [blue, "enums/Type_reference.Color.html#BLUE"],
    [make, "functions/Type_reference.make.html"],
    [beta, "interfaces/Type_reference.Beta.html"],
  ]);
  const anchors = new Map<any, string>([
    [id, "id"],
    [label, "label"],
    [red, "RED"],
    [blue, "BLUE"],
  ]);
  const router = {
    hasUrl: (r: any) => urls.has(r),
    getFullUrl: (r: any) => urls.get(r),
    getAnchor: (r: any) => anchors.get(r),
  };

  return { project: project as any, router: router as any };
}

describe("extractRecords", () => {
  const { project, router } = buildFixture();
  const records = extractRecords(project, router);
  const byKey = Object.fromEntries(records.map((r: any) => [r.key, r]));

  it("emits one record per top-level symbol and member, keyed by the {@link} target", () => {
    expect(records.map((r: any) => r.key)).toEqual([
      "Beta",
      "Color",
      "Color.BLUE",
      "Color.RED",
      "Widget",
      "Widget.id",
      "Widget.label",
      "make",
    ]);
  });

  it("skips @internal symbols and re-export references", () => {
    expect(byKey.Secret).toBeUndefined();
    expect(byKey.ReExported).toBeUndefined();
  });

  it("builds top-level records with members, category, and a page URL", () => {
    expect(byKey.Widget).toMatchObject({
      name: "Widget",
      kind: "Interface",
      parent: null,
      category: "Config",
      summary: "A widget. See Color.",
      signature: "interface Widget",
      members: ["Widget.id", "Widget.label"],
      related: ["Color"],
      url: "interfaces/Type_reference.Widget.html",
      anchor: null,
    });
  });

  it("builds member records with anchored URLs and inherited category", () => {
    expect(byKey["Widget.id"]).toMatchObject({
      name: "id",
      kind: "Property",
      parent: "Widget",
      category: "Config",
      signature: "id: string",
      url: "interfaces/Type_reference.Widget.html#id",
      anchor: "id",
    });
  });

  it("captures @deprecated flag, message, and optional markers", () => {
    expect(byKey["Widget.label"]).toMatchObject({
      deprecated: true,
      deprecatedMessage: "Use id instead.",
      signature: "label?: string",
    });
  });

  it("captures @experimental", () => {
    expect(byKey.Beta.experimental).toBe(true);
    expect(byKey.Widget.experimental).toBe(false);
  });

  it("renders enum members with their value signatures", () => {
    expect(byKey.Color.kind).toBe("Enum");
    expect(byKey.Color.members).toEqual(["Color.BLUE", "Color.RED"]);
    expect(byKey["Color.RED"]).toMatchObject({
      kind: "EnumMember",
      category: "Theme",
      signature: 'RED = "red"',
    });
  });

  it("builds function signatures and collects @example blocks from the signature comment", () => {
    expect(byKey.make).toMatchObject({
      kind: "Function",
      category: "Utilities",
      signature: "make(n: number): Widget",
      examples: ["const w = make(1);"],
    });
  });
});

describe("serializeJsonIndex", () => {
  const { project, router } = buildFixture();
  const records = extractRecords(project, router);

  it("produces a stable, keyed lookup map with a trailing newline", () => {
    const json = serializeJsonIndex(records, META);
    expect(json.endsWith("\n")).toBe(true);
    expect(serializeJsonIndex(records, META)).toBe(json); // byte-stable

    const doc = JSON.parse(json);
    expect(doc).toMatchObject({
      version: "v1.0.0",
      baseUrl: "https://example.com/docs/",
    });
    expect(Object.keys(doc.symbols)).toEqual(records.map((r: any) => r.key)); // sorted order
    expect(doc.symbols["Widget.id"].url).toBe(
      "interfaces/Type_reference.Widget.html#id",
    );
  });
});

describe("serializeMarkdown", () => {
  const { project, router } = buildFixture();
  const records = extractRecords(project, router);
  const files = serializeMarkdown(records, META);

  it("emits one page per top-level symbol, none for skipped/members", () => {
    expect(Object.keys(files).sort()).toEqual([
      "markdown/Beta.md",
      "markdown/Color.md",
      "markdown/Widget.md",
      "markdown/make.md",
    ]);
  });

  it("renders members as sections with resolved reference URLs and a trailing newline", () => {
    const page = files["markdown/Widget.md"];
    expect(page.startsWith("# Widget\n")).toBe(true);
    expect(page).toContain("## Members");
    expect(page).toContain("### id");
    expect(page).toContain(
      "https://example.com/docs/interfaces/Type_reference.Widget.html#id",
    );
    expect(page.endsWith("\n")).toBe(true);
  });
});
