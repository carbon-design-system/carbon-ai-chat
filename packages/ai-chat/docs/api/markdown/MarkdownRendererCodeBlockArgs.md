# MarkdownRendererCodeBlockArgs

**Experimental.**

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererCodeBlockArgs.html

Argument passed to the fenced code-block renderer callbacks on
CustomMarkdownRenderers.codeBlock and
WCCustomMarkdownRenderers.codeBlock. Extends
MarkdownRendererCodeBlockData with the source token, full
TokenTree node, and a `slotName` that is stable across renders and
unique across every rendered markdown block on the page, so it is safe to
use as a key. Treat the value as opaque; its format is not part of the API.

## Signature

```ts
interface MarkdownRendererCodeBlockArgs
```

## Members

### code

`code: string`

**Experimental.**

The raw code text inside the fence. May be incomplete while streaming.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererCodeBlockArgs.html#code)

### isStreaming

`isStreaming: boolean`

**Experimental.**

True while the chat is still receiving chunks of the message this code
block belongs to.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererCodeBlockArgs.html#isstreaming)

### language

`language: string`

**Experimental.**

Language identifier from the fence info string (empty when unset).

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererCodeBlockArgs.html#language)

### node

`node: Readonly<TokenTree>`

**Experimental.**

The full token-tree node.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererCodeBlockArgs.html#node)

### slotName

`slotName: string`

**Experimental.**

Stable slot identifier for this rendered element. Unique across every
markdown element on the page, and reused across renders — including
streaming chunks — while the underlying source line stays put, which makes
it a safe React key. Treat the value as opaque; its format is not part of
the API.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererCodeBlockArgs.html#slotname)

### token

`token: Readonly<Token>`

**Experimental.**

The markdown-it `Token` (a `fence`) for the matched element — see the
`markdown-it` `Token` documentation for the field shape.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.MarkdownRendererCodeBlockArgs.html#token)

## Related

- [CustomMarkdownRenderers.codeBlock](./CustomMarkdownRenderers.md)
- [MarkdownRendererCodeBlockData](./MarkdownRendererCodeBlockData.md)
- [TokenTree](./TokenTree.md)
- [WCCustomMarkdownRenderers.codeBlock](./WCCustomMarkdownRenderers.md)
