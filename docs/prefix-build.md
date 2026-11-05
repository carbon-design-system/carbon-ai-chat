# Build with a custom tag prefix

The Carbon AI Chat 2.0 stack adds two build commands. Use them before bundling your app. Each command copies the installed ESM files and changes tag names, styles, and events to your prefix.

## For chat

This command builds chat, chat components, and their Carbon web-component children with one prefix.

```sh
# Requires the prefix tool from the 2.0 stack.
# Replaces ./vendor/chat-acme and all its contents.
npm exec -- create-ai-chat-prefixed-build --prefix acme --out ./vendor/chat-acme
```

Import the generated host entry. Its filename stays unchanged; its tag becomes `<acme-aichat-container>`.

```js
import './vendor/chat-acme/ai-chat/web-components/cds-aichat-container/index.js';
```

## For standalone components

This command builds chat components and their Carbon children. It does not require the chat app.

```sh
# Requires the prefix tool from the 2.0 stack.
# Replaces ./vendor/components-acme and all its contents.
npm exec -- create-ai-chat-components-prefixed-build --prefix acme --out ./vendor/components-acme
```

Import a family barrel to register its elements, such as `<acme-aichat-card>`.

```js
import './vendor/components-acme/ai-chat-components/components/aichat-card/index.js';
```

## Options and output

Use a dedicated output directory in your project. The command replaces that whole directory on each run.

- The prefix is required. Use lowercase letters, digits, and hyphens, starting with a letter. The exact default `cds` is rejected.
- Without an output option, the command writes to a directory named for the prefix and invoking package.
- The source option overrides only the invoking package's ESM tree. Children still resolve from that installed package chain.
- Use the help option to list flags and default paths.

Each layer keeps its filenames. Types sit beside JavaScript, and manifests sit at each layer's root when the source package supplies them. Keep your app's normal Carbon theme stylesheet. Shared `--cds-*` tokens stay unchanged. React, Lit, and other external packages remain normal app dependencies.

The implementation copies [Carbon's alpha.3 generator](https://github.com/carbon-design-system/carbon/blob/659c96584a68027d391458b4d9c3dac479e1e357/packages/web-components/bin/create-prefixed-build.js). Local adapters preserve file references and redirect imports across the generated layers. [Consumer migration guidance](https://github.com/carbon-design-system/carbon-ai-chat/issues/1886) remains a separate task.
