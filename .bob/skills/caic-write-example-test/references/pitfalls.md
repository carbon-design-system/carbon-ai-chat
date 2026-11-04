# pitfalls.md — assertions that pass without proving anything

Read this before writing or healing a spec's assertions. Each pair below was a real failure on the example suites: a test that looked green while proving little, or one that failed only under load.

## Reply text matches the screen-reader copy

The chat keeps an off-screen live region that repeats each reply. A page-wide substring match finds both, and fails only when several suites run at once.

```ts
// ✗ also matches the live-region copy
await expect(page.getByText(reply)).toBeVisible();

// ✓ the live region sits outside the main panel
await expect(
  page.getByTestId(PageObjectId.MAIN_PANEL).getByText(reply)
).toBeVisible();
```

Host-rendered (slotted) content is not inside `MAIN_PANEL`. Select it by the example's own class with `.filter({ visible: true })`.

## An absence check that cannot fail

A check that something is gone passes if it never appeared. Show the state first.

```ts
// ✗ passes before any list could have opened
await input.fill('zzzz-no-match');
await expect(page.getByRole('listbox')).toHaveCount(0);

// ✓ prove the list can appear, then that it goes
await input.fill('carbon');
await expect(page.getByRole('listbox')).toBeVisible();
await input.fill('zzzz-no-match');
await expect(page.getByRole('listbox')).toHaveCount(0);
```

## The prompt's text and value

In a prompt with no rich-text features the input is a native `<textarea>`, which has no child text.

```ts
// ✗ always true for a textarea
await expect(input).toHaveText('');

// ✓ checks what the user sees
await expect(input).toHaveValue('');
```

Clearing a rich prompt with `fill('')` sometimes skips the editor's update. Clear it as a user does: `press('ControlOrMeta+a')`, then `press('Backspace')`, then `await expect(input).toBeEmpty()`.

## `press()` hides lost focus

`locator.press()` focuses its target first, so it repairs the focus loss it should reveal.

```ts
// ✗ refocuses the toggle for you
await toggle.press('Enter');

// ✓ check where focus is, then press where it is
await expect(toggle).toBeFocused(); // fails today? record it as a fixme
await page.keyboard.press('Enter');
```

## Two matches for one control

Some icon buttons expose a `cds-icon-button` host with `role=button` and an inner labelled button, so `getByRole` hits strict-mode. Use `getByLabel(name, { exact: true })` to reach the inner one, and note the duplicate as an accessibility finding.

## A stop test that waits by accident

A test that sends again after Stop can pass only because the mock stays busy for its full stream time. Assert the back end's own stop result and that the last line is absent. Do not infer it from a later send.

## Positional locators

`.first()`, `.last()`, and `.nth()` hide ambiguity. Removing one has exposed a real bug. Scope the locator, or match a whole element exactly. Keep a positional locator only when order is what the test checks, and say why in a comment.

## `force: true` skips the checks

`click({ force: true })` skips the actionability checks that catch a covered or hidden control. The generator adds it by habit, and the test usually passes without it.

```ts
// ✗ hides a covered or disabled target
await editor.click({ force: true });

// ✓ let the click wait for the control
await editor.click();
```

Keep `force` only where a comment says what blocks the click and why that is expected.

## A loop bound nobody chose

A loop that presses Tab "up to 10 times" has a number with no reason behind it, and the helper that tests focus inside it hides which press failed.

```ts
// ✗ why 10? and which press reached the editor?
for (let i = 0; i < 10; i++) {
  if (await editor.evaluate((el) => el.matches(':focus'))) break;
  await page.keyboard.press('Tab');
}

// ✓ press the known number of times, then check
await page.keyboard.press('Tab');
await expect(editor).toBeFocused();
```

When the number of presses is not known, count the focusable controls before the target and say so in a comment.

## Related guidance

- [playwright.md](../../../../examples/references/playwright.md) — the guide's Selectors and Determinism sections
- [SKILL.md](../SKILL.md) — the procedure this page supports
