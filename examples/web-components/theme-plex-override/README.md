# Theme Plex override

A lit example that's based off of the `Basic` example. The primary purpose of this example is to demonstrate how you can overwrite the Plex font that comes pre-installed on applications using a Carbon theme.

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-theme-plex-override
```

See [../README.md](../README.md) for the full setup walkthrough.
