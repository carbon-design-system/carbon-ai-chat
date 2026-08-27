# ChatShortcutConfig

**Experimental.**

- Kind: Interface
- Category: Config
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.ChatShortcutConfig.html

Configuration for a keyboard shortcut.

## Signature

```ts
interface ChatShortcutConfig
```

## Members

### isOn

`isOn?: boolean`

**Experimental.**

Whether the keyboard shortcut is enabled. Defaults to `false`, so the shortcut is
inactive until you turn it on. Setting `key` or `modifiers` alone does not enable it.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.ChatShortcutConfig.html#ison)

### key

`key?: string`

**Experimental.**

The key to match, compared case-insensitively against `KeyboardEvent.key`.
Examples: `"c"`, `"F6"`, `"/"`. Each shortcut supplies its own default, so omit this
to keep the built-in binding and set only ChatShortcutConfig.isOn.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.ChatShortcutConfig.html#key)

### modifiers

`modifiers?: { alt?: boolean; ctrl?: boolean; meta?: boolean; shift?: boolean }`

**Experimental.**

Modifier keys that must be held for the shortcut to match. A modifier left unset must
not be held, so `{ ctrl: true }` does not match Ctrl + Shift + the key. Omit this to
keep the shortcut's default modifiers.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.ChatShortcutConfig.html#modifiers)
