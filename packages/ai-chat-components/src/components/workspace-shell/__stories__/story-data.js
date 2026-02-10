/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import { action } from "storybook/actions";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import Version16 from "@carbon/icons/es/version/16.js";
import Download16 from "@carbon/icons/es/download/16.js";
import Share16 from "@carbon/icons/es/share/16.js";
import Launch16 from "@carbon/icons/es/launch/16.js";
import Maximize16 from "@carbon/icons/es/maximize/16.js";
import Close16 from "@carbon/icons/es/close/16.js";

export const actionLists = {
  "Advanced list": [
    {
      text: "Version",
      icon: iconLoader(Version16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
    {
      text: "Download",
      icon: iconLoader(Download16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
    {
      text: "Share",
      icon: iconLoader(Share16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
    {
      text: "Launch",
      icon: iconLoader(Launch16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
    {
      text: "Maximize",
      icon: iconLoader(Maximize16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
    {
      text: "Close",
      fixed: true,
      icon: iconLoader(Close16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
  ],
  "Basic list": [
    {
      text: "Launch",
      icon: iconLoader(Launch16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
    {
      text: "Maximize",
      icon: iconLoader(Maximize16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
    {
      text: "Close",
      fixed: true,
      icon: iconLoader(Close16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
  ],
  "Close only": [
    {
      text: "Close",
      fixed: true,
      icon: iconLoader(Close16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
  ],
  None: [],
};

export const FooterActionList = {
  None: undefined,
  "One button": [
    {
      id: "primary",
      label: "Primary",
      kind: "primary",
      payload: { test: "value" },
    },
  ],
  "A danger button": [
    {
      id: "danger",
      label: "Danger",
      kind: "danger",
      payload: { test: "value" },
    },
  ],
  "A ghost button": [
    {
      id: "ghost",
      label: "Ghost",
      kind: "ghost",
      payload: { test: "value" },
    },
  ],
  "Two buttons": [
    {
      id: "secondary",
      label: "Secondary",
      kind: "secondary",
      payload: { test: "value" },
    },
    {
      id: "primary",
      label: "Primary",
      kind: "primary",
      payload: { test: "value" },
    },
  ],
  "Two buttons with one ghost": [
    {
      id: "ghost",
      label: "Ghost",
      kind: "ghost",
      payload: { test: "value" },
    },
    {
      id: "primary",
      label: "Primary",
      kind: "primary",
      payload: { test: "value" },
    },
  ],
  "Three buttons": [
    {
      id: "secondary",
      label: "Secondary",
      kind: "secondary",
      payload: { test: "value" },
    },
    {
      id: "tertiary",
      label: "Tertiary",
      kind: "tertiary",
      payload: { test: "value" },
    },
    {
      id: "primary",
      label: "Primary",
      kind: "primary",
      payload: { test: "value" },
    },
  ],
  "Three buttons with one ghost": [
    {
      id: "secondary",
      label: "Secondary",
      kind: "secondary",
      payload: { test: "value" },
    },
    {
      id: "primary",
      label: "Primary",
      kind: "primary",
      payload: { test: "value" },
    },
    {
      id: "ghost",
      label: "Ghost",
      kind: "ghost",
      payload: { test: "value" },
    },
  ],
  "Three buttons with one danger": [
    {
      id: "ghost",
      label: "Ghost",
      kind: "ghost",
      payload: { test: "value" },
    },
    {
      id: "secondary",
      label: "Secondary",
      kind: "secondary",
      payload: { test: "value" },
    },
    {
      id: "danger",
      label: "Danger",
      kind: "danger",
      payload: { test: "value" },
    },
  ],
};

export const multilineCode = `/**
 * Carbon highlight showcase: control keywords, types, literals, doc comments, and more.
 * Designers can compare against https://carbondesignsystem.com
 */
import type { PaletteDefinition } from "./tokens";
import { readFile } from "fs/promises";

/**
 * Custom decorator to exercise meta/annotation styling.
 */
function Showcase(): ClassDecorator {
  return (target) => Reflect.defineMetadata?.("showcase", true, target);
}

type Nullable<T> = T | null | undefined;

interface TokenSwatch {
  readonly name: string;
  readonly hex: string;
  emphasis?: "strong" | "emphasis" | "strikethrough";
  notes?: string;
}

enum TokenGroup {
  Keyword = "keyword",
  Variable = "variable",
  String = "string",
  Number = "number",
  Comment = "comment",
}

namespace Guides {
  export const headings = [
    "# Heading One",
    "## Heading Two",
    "### Heading Three",
    "#### Heading Four",
    "##### Heading Five",
    "###### Heading Six",
  ] as const;

  export const markdown = [
    "> Quote with *emphasis*, **strong text**, \`code\`, and [link](https://example.com).",
    "- Bullet item",
    "1. Ordered item",
    "---",
    "~~Strikethrough~~ remains supported.",
  ];
}

@Showcase()
export class TokenShowcase<T extends TokenSwatch> {
  static readonly version = "1.0.0";
  static readonly palette: Record<TokenGroup, string> = {
    [TokenGroup.Keyword]: "--cds-syntax-keyword",
    [TokenGroup.Variable]: "--cds-syntax-variable",
    [TokenGroup.String]: "--cds-syntax-string",
    [TokenGroup.Number]: "--cds-syntax-number",
    [TokenGroup.Comment]: "--cds-syntax-comment",
  };

  #pattern = /--cds-syntax-[a-z-]+/g;
  #cache = new Map<string, T>();
  private url = new URL("https://carbon.design/components/code-snippet");
  private pending: Nullable<Promise<void>> = null;

  constructor(private readonly theme: PaletteDefinition, private mutable = false) {
    if (mutable && theme.allowOverrides === false) {
      throw new Error("Mutable showcase requires override permission.");
    }
  }

  /* multi-line
     comment demonstrating block syntax */

  async hydrate(path: string): Promise<void> {
    const file = await readFile(path, { encoding: "utf-8" });
    const matches = file.match(this.#pattern) ?? [];
    matches.forEach((token, index) => {
      const swatch = {
        name: token,
        hex: this.theme.tokens[token] ?? "#000000",
        notes: Guides.headings[index % Guides.headings.length],
      } as T;
      this.#cache.set(token, swatch);
    });
  }

  annotate(entry: T): void {
    const local = { ...entry, local: true } as T & { local: boolean };
    this.#cache.set(entry.name, local);
  }

  resolve(name: string): Nullable<T> {
    if (!this.#cache.has(name)) {
      return null;
    }
    const result = this.#cache.get(name) ?? null;
    return result && { ...result };
  }

  renderMarkdown(): string {
    const parts = [...Guides.headings, ...Guides.markdown];
    return parts.join("\\n");
  }

  toJSON(): Record<string, unknown> {
    return {
      url: this.url.href,
      version: TokenShowcase.version,
      mutable: this.mutable,
      tokens: Array.from(this.#cache.keys()),
      palette: TokenShowcase.palette,
    };
  }

  get summary(): string {
    return \`Loaded \${this.#cache.size} tokens for \${this.theme.name} (#\${this.theme.revision})\`;
  }
}

// trailing comment with TODO inside to exercise single-line states
`;
