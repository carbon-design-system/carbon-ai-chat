# MarkdownRendererCodeBlockData

**Experimental.**

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererCodeBlockData.html

Parsed code-block payload extended by MarkdownRendererCodeBlockArgs —
the argument shape the code-block renderer callback actually receives.
Carries the language, code text, and streaming flag.

## Signature

```ts
interface MarkdownRendererCodeBlockData
```

## Members

### code

`code: string`

**Experimental.**

The raw code text inside the fence. May be incomplete while streaming.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererCodeBlockData.html#code)

### isStreaming

`isStreaming: boolean`

**Experimental.**

True while the chat is still receiving chunks of the message this code
block belongs to.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererCodeBlockData.html#isstreaming)

### language

`language: string`

**Experimental.**

Language identifier from the fence info string (empty when unset).

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererCodeBlockData.html#language)

## Related

- [MarkdownRendererCodeBlockArgs](./MarkdownRendererCodeBlockArgs.md)
