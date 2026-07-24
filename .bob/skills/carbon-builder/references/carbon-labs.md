# Carbon Labs Guidance

Use this reference only when the request explicitly involves Carbon Labs packages or the repository already depends on them.

**Framework scope:** This guidance is React-only. Web Components equivalents for Labs components have not been verified and should not be assumed to exist.

## 1. Stability and Package Selection

- Stable Carbon remains the default when it satisfies the request.
- Do not use deprecated `@carbon/labs-react` for new guidance.
- Prefer current package-specific Labs packages and verify the exact package before generating code.
- Common packages validated during Labs-tool testing:
  - `@carbon-labs/react-ui-shell`
  - `@carbon-labs/react-resizer`
  - `@carbon-labs/react-whats-new`
  - `@carbon-labs/react-processing`
  - `@carbon-labs/react-animated-header` (draft/preview, homepage-oriented)

Treat each Labs package as a separate integration. Do not assume one package exports another package's components.

## 2. Package Verification Rules

Before generating code for a Labs request:

1. Confirm the requested feature actually belongs to a current `@carbon-labs/*` package.
2. Confirm the exact package name.
3. Confirm the exact import path and exported API.
4. Confirm whether the package requires package-specific SCSS imports.
5. Confirm whether the package expects explicit host theme attributes such as `data-carbon-theme`.

If any of these are unclear, do not guess from training data or from deprecated `@carbon/labs-react` examples.

## 3. Styling and Theme Requirements

Start from the normal React Carbon baseline:

```scss
@use "@carbon/react";
```

Then verify whether the Labs package requires additional package-specific SCSS.

```scss
@use "@carbon/react";
@use "@carbon-labs/react-processing/scss/index";
```

Rules:

- Do not assume the Carbon baseline alone fully styles Labs components.
- Do not invent package SCSS paths; verify them first.
- If the package requires explicit theme context, prefer the documented host requirement.
- Some Labs integrations rely on `data-carbon-theme` on the host container.

Example pattern when package guidance requires explicit theme context:

```jsx
<div data-carbon-theme="g100">
  <LabsComponent />
</div>
```

Do not replace a documented `data-carbon-theme` requirement with an arbitrary `<Theme>` wrapper unless the package documentation explicitly supports that pattern.

## 4. Known Labs Coverage to Preserve

When the request maps to these areas, verify the corresponding package first:

| Feature area                                                                      | Package to verify first              |
| --------------------------------------------------------------------------------- | ------------------------------------ |
| Animated Header                                                                   | `@carbon-labs/react-animated-header` |
| UI Shell _(only when explicitly requested — "UIShell" alone means stable Carbon)_ | `@carbon-labs/react-ui-shell`        |
| Resizer                                                                           | `@carbon-labs/react-resizer`         |
| What's New                                                                        | `@carbon-labs/react-whats-new`       |
| Processing                                                                        | `@carbon-labs/react-processing`      |

This list is a verification starting point, not permission to skip package/API confirmation.

## 5. Verification Checklist

Before finalizing a Labs implementation, confirm all of the following:

- [ ] Deprecated `@carbon/labs-react` is not used
- [ ] Exact `@carbon-labs/*` package is verified
- [ ] Import path and exported API are verified
- [ ] Package-specific SCSS requirements are verified
- [ ] Theme/container requirements such as `data-carbon-theme` are verified
- [ ] Rendered styling is visually correct
- [ ] Behavior matches the package-specific example or documentation

## 6. Failure Patterns

### Deprecated package drift

If an example or repo note references `@carbon/labs-react`, do not carry that forward into new guidance. Translate the request to the current package model and verify the modern package first.

### Partial styling after install

If the component renders but looks incomplete, verify package-specific SCSS imports before changing layout or overriding Carbon classes.

### Theme mismatch

If colors, layers, or spacing look wrong, verify whether the package expects `data-carbon-theme` on the host container.

### Stable Carbon assumptions applied to Labs

If a stable Carbon pattern compiles but the Labs component still behaves incorrectly, stop assuming parity. Re-check the package-specific setup and examples.

## 7. Response Guidance

When answering a Labs request:

- State the verified package explicitly.
- Mention any package-specific SCSS requirement if present.
- Mention any required host theme attribute such as `data-carbon-theme`.
- Call out that Labs APIs and styling assumptions may differ from stable Carbon, so verification is required before declaring success.
