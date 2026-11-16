# tests.md — `@carbon/ai-chat` testing

Load this when writing or fixing Jest tests in this package.

Tests are organized by what they validate. Naming is `_spec.ts(x)` (not `.test.ts`); files live in `tests/<area>/spec/` (not colocated with source — opposite of `@carbon/ai-chat-components`).

## Test categories

| Category | Location | Validates | Pattern |
| --- | --- | --- | --- |
| Contract | `tests/contract/spec/<area>/` | Public host behavior | Public entries, callbacks, events, state snapshots, and documented DOM hooks |
| Store & hooks | `tests/store/spec/` | Redux-like store + custom hooks | Local test store, wrap in `StoreProvider`, assert state |
| Services | `tests/services/spec/` | Service orchestration & side effects | Stub `ServiceManager`, instantiate directly, assert calls/state |
| Components | `tests/components/spec/` | React component rendering & interactions | Testing Library, simulate user, assert DOM |
| Integration | `demo/tests/` (Playwright) | End-to-end flows across the full stack | See [demo/AGENTS.md](../../../demo/AGENTS.md) |

### Store & hook example

`tests/store/spec/reactReduxShim_spec.tsx`:

```typescript
const store = createAppStore(initialState);
render(
  <StoreProvider store={store}>
    <TestComponent />
  </StoreProvider>
);
store.dispatch(someAction());
expect(screen.getByText('expected')).toBeInTheDocument();
```

Add when: new actions/reducers, new `useSelector` patterns, state-dependent component behavior.

### Service example

`tests/services/spec/MessageService_spec.ts`:

```typescript
const mockManager = {
  store: { getState: jest.fn(), dispatch: jest.fn() },
  actions: { addMessage: jest.fn() },
  eventBus: { emit: jest.fn() },
  instance: mockInstance,
};
const service = new MessageService(mockManager);
await service.sendMessage('test');
expect(mockManager.actions.addMessage).toHaveBeenCalled();
```

Add when: new service methods, lifecycle changes (start/stop), complex orchestration.

### Component tests

Add when: new React components, prop changes, user interaction flows.

### Integration tests

Add when: new user-facing features, cross-component workflows, config-dependent behavior. Patterns live in [demo/AGENTS.md](../../../demo/AGENTS.md).

## Contract tests pin host behavior

For a change a host can observe, add or change a contract test in the same commit. Put tests in `tests/contract/spec/<area>/` and shared drivers and fixtures in `tests/contract/helpers/`.

Drive the `ChatInstance` handed to a host, public host props or attributes, slots, and events. Assert returned values, `getState()` snapshots, events, and public callbacks such as `customSendMessage` and render props. A store-shape assertion belongs in an internal test.

Use these public source entries for imports: `src/aiChatEntry`, `src/serverEntry`, `src/types/**`, `src/testing/**`, and `src/web-components/cds-aichat-{container,custom-element}/index`. Share fixtures through `tests/contract/helpers/`. Do not import other source modules, the store, or `tests/test_helpers.ts`.

Find DOM through exported test IDs, slots, parts, roles and accessible names. The documented `cds-aichat--hidden` class is also public. Carbon tag names, Carbon classes, other classes, and markup shape are internal details. Prefer names you set through `config.strings` or message content. Use a browser test when jsdom cannot show the public effect.

**If an existing contract test fails during a refactor, stop and report the failure. Never edit its expectations to make the refactor pass.** A contract test changes only for a deliberate public behavior change. Record that choice and put the `behavior-change` label on its PR.

### Guard contract edits with the manifest

After the [build preflight](../../../references/commands.md#build-preflight), run from the repo root:

```bash
npm run contract:manifest
npm run contract:manifest:check
npm run test:contract-manifest
```

Commit `tests/contract/MANIFEST.tsv` with the tests. Generation discovers every expanded case through Jest. It hashes test bodies, helper files, and shared context such as fixtures, hooks, and parameter data. A check reads without writing and fails on stale rows. Cached discovery also checks the Node runtime and environment. It hashes env values without saving them.

CI compares the PR's exact base and head manifests. Added rows pass. Changed or removed rows require `behavior-change`. A rename removes an old row. A new independent test or helper adds rows; changing a shared parameter table can require the label even when it adds cases. Each same-file call that registers tests, such as an enum fixture call, has its own context row.

Policy runs again when labels or the PR base change. A base without a manifest starts with an empty baseline. An unavailable base commit is an error. If a base update makes the merged manifest stale, merge the base and regenerate it.

### Check contract execution

After the build preflight, run `npm run measure -- --changed <base>`. Its advisory `contract` row lists changed runtime source lines no contract test executes and affected branch arms that stay untaken. It reads Istanbul's `coverage-final.json`; the producer runs only contract tests and includes runtime `src/**/index.ts` files.

The selected `--source worktree|index|head` must match the source used for coverage. Head and index modes require matching relevant files on disk. With no runtime source diff, the row skips the producer. It reports type-only and non-executable lines separately. Missing files, producer errors, and mismatched source remain unverified.

To reuse coverage, set `CONTRACT_COVERAGE_REPORT` to the absolute report path. Its sibling `<report>.meta.json` must have a matching fingerprint for source, tests, config, lockfile, and built components. Node and environment settings must match too. Keep reports temporary and uncommitted. Coverage gaps are advisory and have no CI threshold.

Executed lines do not prove assertions. For each new runtime branch, name the contract test that fails on a narrow source break. Plant it in an isolated scratch copy, then show a clean pass, the behavioral failure, and a restored pass. If another guard masks the break, record why. For behavior a host can reach, also plant a break that exposes the public defect. Give a specific reason for a branch with no public effect. Keep the proof public.

## Running tests

From `packages/ai-chat/`:

```bash
npm test                                        # full suite with coverage
npm test -- path/to/file_spec.ts                 # single file, with coverage
npm test -- -t "test name pattern"               # by name
npm test -- --watch                              # watch mode
```

Test setup: `tests/setup.ts` installs DOM + testing-library setup; `tests/test_helpers.ts` has shared fixtures.

## Debugging failures

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Failure in `@carbon/ai-chat-components` code that is correct in its source | Jest reads that package's built `es/`, and `es/` is stale | Rebuild it first — see the [build preflight](../../../references/commands.md#build-preflight) |

## Related guidance

- [packages/ai-chat/AGENTS.md](../AGENTS.md) — package overview
- [services.md](services.md) — service archetypes (test pattern background)
- [src/chat/store/AGENTS.md](../src/chat/store/AGENTS.md) — store rules
