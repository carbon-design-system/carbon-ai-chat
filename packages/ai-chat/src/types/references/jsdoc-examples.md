# jsdoc-examples.md — worked JSDoc examples

Load this when you want a worked example of the rules in [src/types/AGENTS.md](../AGENTS.md) — what a good top-level type, property, and cross-package re-declaration look like, and what a bad one looks like.

### Good — top-level type

```ts
/**
 * Status of the chain of thought step.
 *
 * @category Messaging
 */
enum ChainOfThoughtStepStatus {
  /**
   * The tool call is currently processing.
   */
  PROCESSING = 'processing',

  /**
   * The tool call failed.
   */
  FAILURE = 'failure',

  /**
   * The tool call succeeded.
   */
  SUCCESS = 'success',
}
```

Why it works: `@category` is valid, sentences end in periods, each member is documented individually, no internal jargon.

### Bad — top-level type

```ts
// BAD
/** step status — see #4821 for context */
enum ChainOfThoughtStepStatus {
  PROCESSING = 'processing', // TODO rename?
  FAILURE = 'failure',
  SUCCESS = 'success',
}
```

Why it fails: no `@category` (lands in `*`), no member-level JSDoc, note-form rather than sentences, internal ticket reference, TODO in public copy.

### Good — property referencing another public symbol

```ts
/**
 * The time to wait for a response from the back-end before cancelling the
 * request, in milliseconds. Defaults to the value returned by
 * {@link DefaultMessagingTimeouts.response}.
 */
responseUserProfileTimeoutMS?: number;
```

Why it works: units stated, default documented, `{@link}` resolves and will fail the build if it breaks.

### Good — linking back to the consumer

```ts
import type { AutocompleteConfig as _AutocompleteConfig } from '@carbon/ai-chat-components/es/components/prompt-line/index.js';

/**
 * Live autocomplete config consumed by {@link InputConfig.autocomplete}.
 * Selection inserts plain text rather than a schema node; no chip is
 * rendered.
 *
 * @category Config
 * @interface
 */
export type AutocompleteConfig = _AutocompleteConfig;
```

Why it works: the first sentence tells the reader where this type is reached from in the public API, so anyone landing on `AutocompleteConfig` in TypeDoc or the MCP index can jump straight to `InputConfig.autocomplete` to see it in context. `@interface` is what makes the type's own properties render — see [Object-shaped targets need `@interface`](cross-package-types.md#object-shaped-targets-need-interface).

## Related guidance

- [src/types/AGENTS.md](../AGENTS.md) — the rules these illustrate
- [cross-package-types.md](cross-package-types.md) — the re-declaration pattern
- [code-examples.md](../../../references/code-examples.md) — criteria for `@example` blocks
