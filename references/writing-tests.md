# writing-tests.md: writing a test case

Load this when you write or change a test case in `@carbon/ai-chat` or `@carbon/ai-chat-components`. It covers the case itself: its scenario, its name, its helpers, its doubles and cleanup, and its waits.

Each package guide owns the rest: where the file goes, which project runs it, and the package's own helpers and signals. Read [ai-chat's tests.md](../packages/ai-chat/references/tests.md) or [the components tests.md](../packages/ai-chat-components/references/tests.md) when you place the file. Read [accessibility.md](accessibility.md#testing-accessibility) when a case checks roles, names, focus, or announcements.

Examples use placeholder names for the code under test, and Vitest's `expect`. A components Lit test writes the same checks in its assertion style, from [the components tests.md](../packages/ai-chat-components/references/tests.md).

## One scenario per case

A case tells one scenario. A reader finds the input, the action, the expected result, and why each check matters, without leaving the case.

- **Name the behavior and its condition in the title,** such as "announces failure assertively, carrying the file-specific reason".
- **Split a case when its rules could fail on their own.** Several checks on one transition can share a case.
- **Say why a check matters** in a one-line comment, when the title doesn't already say it.
- **Write a new title as present-tense behavior, with no "should".** Don't rename an existing test only for this.

```ts
it('keeps the draft when the send fails', async () => {
  const input = createInput({ draft: 'hello' });
  await input.send(() => Promise.reject(new Error('offline')));
  // A failed send must not lose what the user typed.
  expect(input.draft).toBe('hello');
});
```

## Named rows for one rule across inputs

When one rule holds across several inputs, give each input its own named case. Use `it.each`, or a loop that makes one named `it` per input. Then each input fails on its own, under its own name. Keep loops over inputs out of a single `it`.

```ts
it.each([
  { input: '', expected: [] },
  { input: 'a,b', expected: ['a', 'b'] },
])('splits "$input" into $expected', ({ input, expected }) => {
  expect(splitList(input)).toEqual(expected);
});
```

## Helpers hide setup, not the action or the check

A helper may build the fixture. The action and the assertion stay in the case, where a reader sees them. Name a helper for what it does. If it waits, its name says so, as `untilDom()` and `waitForRich()` do.

```ts
it('closes on Escape', async () => {
  const menu = await mountOpenMenu(); // setup, in a helper
  await press(menu, 'Escape'); // the action, in the case
  expect(menu.open).toBe(false); // the check, in the case
});
```

## Doubles keep the collaboration real

- **A spy keeps the real code.** `vi.spyOn(object, 'method')` records each call and still runs the method. Reach for it first.
- **A stub replaces the code.** `mockImplementation()` and `mockReturnValue()` choose the answer, so the test stops proving what the replaced code does. Stub only what you must, and say in a comment what the stub stops the test from proving.

```ts
// The stub stops this test from proving how a real reply is parsed.
vi.spyOn(backend, 'reply').mockResolvedValue(fixedReply);
```

## Cleanup: config restores spies, you restore the rest

Both packages set `restoreMocks: true`, so Vitest restores every `vi.spyOn` spy before each case. You don't call `mockRestore()`. Make a spy in the case or in `beforeEach`. A spy made in `beforeAll` or a `describe` body is restored before the first case runs.

Restore everything else yourself, in `afterEach` or a `finally`, so a failing case can't leak it into the next one:

| You changed | Restore it |
| --- | --- |
| A global, through `vi.stubGlobal()` | `vi.unstubAllGlobals()` |
| Timers, through `vi.useFakeTimers()` | `vi.useRealTimers()` |
| A module, mocked inside a case with `vi.doMock()` | `vi.doUnmock()` |
| The document, by adding a node to it | `node.remove()` |

```ts
afterEach(() => {
  vi.unstubAllGlobals();
  host.remove();
});
```

## Waits: wait on a signal

Wait on a signal: a returned promise, an event, or a condition that `vi.waitFor()` polls. Each package guide names its own signals. Never wait a fixed time, and never raise a timeout to make a case pass.

```ts
await vi.waitFor(() => expect(list.items).toHaveLength(1));
```

Use fake timers only when the timer is the thing you wait on, such as a debounce or a delay. Call `vi.useFakeTimers()`, advance past the delay, then assert. A check that something didn't happen advances past the delay first, so it can't pass before the work runs.

```ts
afterEach(() => vi.useRealTimers());

it('saves once typing pauses', () => {
  vi.useFakeTimers();
  editor.type('hi');
  vi.advanceTimersByTime(500); // past the save debounce
  expect(save).toHaveBeenCalledOnce();
});
```

The announcer's 250 ms debounce is the common case. Its example is in [accessibility.md](accessibility.md#testing-accessibility).

## Related guidance

- [commands.md](commands.md): running tests through the npm scripts, and the build preflight
