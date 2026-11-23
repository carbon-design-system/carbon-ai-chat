<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# CustomMenuOption

- Kind: Interface
- Category: Config
- Reference: https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.CustomMenuOption.html

A single menu option.

## Signature

```ts
interface CustomMenuOption
```

## Members

### disabled

`disabled?: boolean`

If true, the menu option will be disabled and cannot be selected.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.CustomMenuOption.html#disabled)

### handler

`handler?: () => void`

The callback handler to call when the option is selected.
Provide either this or `href`, but not both.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.CustomMenuOption.html#handler)

### href

`href?: string`

The URL to navigate to when the option is selected.
Provide either this or `handler`, but not both.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.CustomMenuOption.html#href)

### target

`target?: string`

The target attribute for the link when using `href`.
Defaults to "_self" if not specified.
Common values: "_self", "_blank", "_parent", "_top"

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.CustomMenuOption.html#target)

### testId

`testId?: string`

**Deprecated.** In tests, select the menu option by its visible text instead.
Removed in a 2.x minor release. **Experimental.**

A `data-testid` attribute for the menu option, so tests can find it.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.CustomMenuOption.html#testid)

### text

`text: string`

The text to display for the menu option.

[Reference](https://chat.carbondesignsystem.com/version/v1.26.0-rc.0/docs/interfaces/Type_reference.CustomMenuOption.html#text)
