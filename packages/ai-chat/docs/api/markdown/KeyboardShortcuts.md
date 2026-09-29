<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# KeyboardShortcuts

**Experimental.**

- Kind: Interface
- Category: Config
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0-rc.0/docs/interfaces/Type_reference.KeyboardShortcuts.html

Configuration for all keyboard shortcuts in the chat.
Designed to be extensible for future shortcuts.

## Signature

```ts
interface KeyboardShortcuts
```

## Members

### messageFocusToggle

`messageFocusToggle?: ChatShortcutConfig`

**Experimental.**

Shortcut to toggle focus between the message list and input field. Disabled unless you
set ChatShortcutConfig.isOn to `true`. Defaults to F6, the standard Windows
accessibility shortcut for cycling between regions.

[Reference](https://chat.carbondesignsystem.com/version/v1.22.0-rc.0/docs/interfaces/Type_reference.KeyboardShortcuts.html#messagefocustoggle)
