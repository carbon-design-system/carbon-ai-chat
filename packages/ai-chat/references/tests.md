# tests.md — `@carbon/ai-chat` testing

Load this when writing or fixing Jest tests in this package.

Tests are organized by what they validate. Naming is `_spec.ts(x)` (not `.test.ts`); files live in `tests/<area>/spec/` (not colocated with source — opposite of `@carbon/ai-chat-components`).

## Test categories

| Category      | Location                   | Validates                                | Pattern                                                         |
| ------------- | -------------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| Store & hooks | `tests/store/spec/`        | Redux-like store + custom hooks          | Local test store, wrap in `StoreProvider`, assert state         |
| Services      | `tests/services/spec/`     | Service orchestration & side effects     | Stub `ServiceManager`, instantiate directly, assert calls/state |
| Components    | `tests/components/spec/`   | React component rendering & interactions | Testing Library, simulate user, assert DOM                      |
| Integration   | `demo/tests/` (Playwright) | End-to-end flows across the full stack   | See [demo/AGENTS.md](../../../demo/AGENTS.md)                   |

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

Add when: new actions/reducers, new `useSelector`/`useDispatch` patterns, state-dependent component behavior.

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
await service.sendMessage("test");
expect(mockManager.actions.addMessage).toHaveBeenCalled();
```

Add when: new service methods, lifecycle changes (start/stop), complex orchestration.

### Component tests

Add when: new React components, prop changes, user interaction flows.

### Integration tests

Add when: new user-facing features, cross-component workflows, config-dependent behavior. Patterns live in [demo/AGENTS.md](../../../demo/AGENTS.md).

## Coverage

**Required**:

- All store actions and reducers.
- All service public methods.
- All user-facing component interactions.

**Optional**:

- Private helpers (if complex).
- Edge cases (especially regression-prone ones).
- Performance-critical paths (with benchmarks).

## Running tests

From `packages/ai-chat/`:

```bash
npm test                                                    # full suite with coverage
npx jest path/to/file_spec.ts                               # single file
npx jest -t "test name pattern"                             # by name
npx jest --watch                                            # watch mode
npm run test:coverage --workspace=@carbon/ai-chat           # coverage report
```

Test setup: `tests/setup.ts` installs DOM + testing-library setup; `tests/test_helpers.ts` has shared fixtures.

## Debugging failures

| Symptom          | Likely cause                         | Fix                                                                                                                         |
| ---------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Test timeout     | Unresolved promise or unmocked timer | Verify `jest.useFakeTimers()` is set; await all promises; bump with `jest.setTimeout(10000)` if genuinely long              |
| Flaky test       | Race condition or shared state       | Add `await waitFor()` for async updates; reset shared mocks between tests; isolate with `--runInBand --testNamePattern="…"` |
| Mock not applied | `jest.mock()` runs after import      | Move `jest.mock()` to top of file; `jest.resetModules()` between tests if needed                                            |

## Related guidance

- [packages/ai-chat/AGENTS.md](../AGENTS.md) — package overview
- [services.md](services.md) — service archetypes (test pattern background)
- [src/chat/store/AGENTS.md](../src/chat/store/AGENTS.md) — store rules
- [demo/AGENTS.md](../../../demo/AGENTS.md) — Playwright integration tests
