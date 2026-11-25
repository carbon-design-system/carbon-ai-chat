# writing-tests.md: writing a test case

Load this when you write or change a test case in `@carbon/ai-chat` or `@carbon/ai-chat-components`. It covers the case itself: its scenario, its name, its checks, its helpers, its doubles and cleanup, and its waits.

Each package guide owns the rest: where the file goes, which project runs it, and the package's own helpers and signals. Read [ai-chat's tests.md](../packages/ai-chat/references/tests.md) or [the components tests.md](../packages/ai-chat-components/references/tests.md) when you place the file. Read [accessibility.md](accessibility.md#testing-accessibility) when a case checks roles, names, focus, or announcements.

Examples use placeholder names for the code under test, and Vitest's `expect`. A components Lit test writes the same checks in [its assertion style](../packages/ai-chat-components/references/tests.md#assertion-style).

## One scenario per case

A case tells one scenario. A reader finds the input, the action, the expected result, and why each check matters, without leaving the case.

- **Name the behavior and its condition in the title,** such as "announces failure assertively, carrying the file-specific reason".
- **Split a case when its rules could fail on their own.** Several checks on one transition can share a case. So can an ordered walk through one lifecycle, or one key sequence. Independent rules in one walk get their own cases.
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

## Each check can fail

- **Check what the code produced, not what the test put in.** No `expect(true)`, no type check in place of the result, and no guard that can skip the only check. When a check can't fail by construction, add a positive control: a case that shows the same check failing, or passing on the opposite input.
- **Assert the state the title names before you act,** so the case still reaches that state after the code changes.
- **Before a loop or branch over what a query found, assert the count, or that it exists.** An empty result otherwise passes.

```ts
it('collapses an expanded step on Escape', async () => {
  const step = await mountStep({ expanded: true });
  expect(step.expanded).toBe(true); // the titled starting state
  await press(step, 'Escape');
  expect(step.expanded).toBe(false);
});
```

## Named rows for one rule across inputs

When one rule holds across several inputs, give each input its own named case. Use `it.each`, or a loop that makes one named `it` per input. Then each input fails on its own, under its own name. Keep loops over inputs out of a single `it`. Keep branches out of a row's body, too: a row that needs other steps gets its own case.

```ts
it.each([
  { input: '', expected: [] },
  { input: 'a,b', expected: ['a', 'b'] },
])('splits "$input" into $expected', ({ input, expected }) => {
  expect(splitList(input)).toEqual(expected);
});
```

## Helpers hide setup, not the claim

A helper may build the fixture. It may also perform the case's action when the call in the case names that action, as a placeholder `enterDraft(editor, 'hi')` would. A helper never asserts: the checks stay in the case, where a reader sees them. Name a helper for what it does. If it waits, its name says so, as `untilDom()` and `waitForRich()` do.

```ts
it('closes on Escape', async () => {
  const menu = await mountOpenMenu(); // setup, in a helper
  await press(menu, 'Escape'); // the action, named in the case
  expect(menu.open).toBe(false); // the check, in the case
});
```

A `beforeEach` may assert only a precondition of its own setup, labeled as one. The case's claim stays in the case.

```ts
beforeEach(async () => {
  menu = await mountOpenMenu();
  expect(menu.open).toBe(true); // precondition: the setup opened the menu
});
```

## Doubles keep the collaboration real

- **A spy keeps the real code.** `vi.spyOn(object, 'method')` records each call and still runs the method. Reach for it first.
- **A fake at a public seam keeps the code under test real,** such as a host callback or ai-chat's service desk. Prefer it to a stub inside the code under test.
- **A stub replaces the code.** `mockImplementation()` and `mockReturnValue()` choose the answer, so the test stops proving what the replaced code does. Stub only what you must, and say in a comment what the stub stops the test from proving. That includes a minimal stand-in for a collaborator, such as a stub `ServiceManager` holding only what the unit reads. Never assert a value the stub itself returned.

```ts
// The stub stops this test from proving how a real reply is parsed.
vi.spyOn(backend, 'reply').mockResolvedValue(fixedReply);
```

## Cleanup: config restores spies, you restore the rest

Both packages set `restoreMocks: true`. Before each case, Vitest puts back every method that `vi.spyOn` replaced. You don't call `mockRestore()`. Make a spy in the case or in `beforeEach`. A spy made in `beforeAll` or a `describe` body is restored before the first case runs.

`restoreMocks` leaves two things alone:

- **A `vi.fn()` mock.** In ai-chat it keeps its calls across a file. Components also sets `clearMocks` and `mockReset`, so there each `vi.fn()` loses its calls, and any implementation set after it was made, before each case.
- **A spy on something that's already a mock.** `vi.spyOn` returns that mock and registers no restore.

Restore everything else yourself, in `afterEach` or a `finally`. A leak matters when a later case or file can observe it, in the same file too.

| You changed | Restore it |
| --- | --- |
| A global, by assigning it | Put the saved value back |
| A global, through `vi.stubGlobal()` | `vi.unstubAllGlobals()` |
| Timers, through `vi.useFakeTimers()` | `vi.useRealTimers()` |
| A module, mocked inside a case with `vi.doMock()` | `vi.doUnmock()` |
| The document, by adding a node to it | `node.remove()` |
| The registry, through `customElements.define()` | It can't be undone. Define once, guarded by `customElements.get()` |

```ts
const realOpen = window.open;
afterEach(() => {
  window.open = realOpen;
  host.remove();
});
```

## Waits: wait on a signal

Wait on a signal: a returned promise, an event, or a condition that `vi.waitFor()` polls. Each package guide names its own signals. A frame or macrotask wait is a signal when the code schedules its work on that frame; name the helper for it. A loop of microtask or frame flushes says why its count is enough, or waits on a signal instead. Never wait a fixed time.

```ts
await vi.waitFor(() => expect(list.items).toHaveLength(1));
```

Never raise a case's timeout to make it pass. A file-wide bound, such as one slow boot that every case shares, is fine with a reason comment. A `vi.waitFor()` or `waitUntil` timeout above the test's own timeout never fires.

Use fake timers only when the timer is the thing you wait on, such as a debounce or a delay. Call `vi.useFakeTimers()`, advance past the delay, then assert. To pin a deadline, advance to 1 ms before it and check, then 1 ms past and check again.

```ts
afterEach(() => vi.useRealTimers());

it('saves once typing pauses', () => {
  vi.useFakeTimers();
  editor.type('hi');
  vi.advanceTimersByTime(500); // past the save debounce
  expect(save).toHaveBeenCalledOnce();
});
```

### Show that something didn't happen

Before the claim, wait for a signal the work would have passed: an event it fires before, the call it makes first, or fake timers advanced past its deadline. Otherwise the claim passes before the work runs. The claim needs a [positive control](#each-check-can-fail) under the same wait; a sibling case that shows it happening is enough.

When neither a signal nor fake timers fit, such as in a full mount, the last resort is a named real-time window behind a barrier, with a comment that says why no signal exists. A bare pause is never enough.

```ts
// No event marks the end of delivery, and fake timers stall the mount.
const DELIVERY_WINDOW_MS = 300;

await untilFirstMessage(chat); // barrier: delivery has started
await new Promise((done) => setTimeout(done, DELIVERY_WINDOW_MS));
expect(onError).not.toHaveBeenCalled();
```

The announcer's 250 ms debounce is the common case. Its example is in [accessibility.md](accessibility.md#testing-accessibility).

## Related guidance

- [commands.md](commands.md): running tests through the npm scripts, and the build preflight
