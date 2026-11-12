# React wrappers in 2.0

React wrappers now check props, event payloads, and refs. Remove unknown props and use a ref for the wrapped element. Callback arguments are DOM events; read their payload from `event.detail`.

The wrappers now use native Lit binding. The old test bridge is removed. It masked missing property updates when DOM tests loaded Lit's Node export. That export also skips event listeners. Browser exports passed the native binding tests across React 17, 18, and 19 with both DOM shims.

```tsx
import React, { useRef } from 'react';
import PromptLine from '@carbon/ai-chat-components/es/react/prompt-line.js';
import { PromptLineElement } from '@carbon/ai-chat-components/es/components/aichat-prompt-line/index.js';

function Prompt() {
  const ref = useRef<PromptLineElement>(null);
  return (
    <PromptLine
      ref={ref}
      onChange={(event) => console.log(event.detail.rawValue)}
    />
  );
}
```

CodeSnippet, Toolbar, and ChatHeader still accept React icons in their action props. Markdown still accepts React nodes from its custom renderers. The autocomplete controller wrapper is an opt-in import. The hook import stays lightweight.

```tsx
import AutocompleteController from '@carbon/ai-chat-components/es/react/autocomplete-controller.js';
```

In a DOM-based Jest project, select Lit's browser export. Keep true Node/SSR tests in a separate project with Node exports.

```js
// jest.dom.config.cjs
module.exports = {
  testEnvironment: '@happy-dom/jest-environment', // Or 'jsdom'.
  testEnvironmentOptions: { customExportConditions: ['browser'] },
};
```
