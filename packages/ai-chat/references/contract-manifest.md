# contract-manifest.md — guarding and checking `@carbon/ai-chat` contract tests

Load this when you add, change, rename, or remove a contract test, or when `npm run measure` reports a `contract` row. What a contract test covers, and the stop rule when one fails, are in [tests.md](tests.md#contract-tests-pin-host-behavior).

## Guard contract edits with the manifest

After the [build preflight](../../../references/commands.md#build-preflight), run from the repo root:

```bash
npm run contract:manifest
npm run contract:manifest:check
npm run test:contract-manifest
```

Commit `tests/contract/MANIFEST.tsv` with the tests. Generation discovers every expanded case through Vitest. It hashes test bodies, helper files, and shared context such as fixtures, hooks, and parameter data. A check reads without writing and fails on stale rows. Run `npm run format:write` before generating, so formatting can't make a row stale.

CI compares the PR's exact base and head manifests. Added rows pass. Changed or removed rows require `behavior-change`. A rename removes an old row. Changing a shared parameter table or a hashed helper can require the label even when it adds cases. A base without a manifest starts with an empty baseline.

## Check contract execution

Run `npm run measure -- --changed <base>`. Its advisory `contract` row lists changed runtime source lines no contract test executes, from Vitest's V8 coverage of the `*.contract.test.*` files. The selected `--source worktree|index|head` must match the source on disk. To reuse a report, set `CONTRACT_COVERAGE_REPORT` to its absolute path; its `.meta.json` fingerprint must match. Keep reports uncommitted.

Executed lines do not prove assertions. For each new runtime branch, name the contract test that fails on a narrow source break. Plant it in a scratch copy, then show a clean pass, the failure, and a restored pass. Give a specific reason for a branch with no public effect.
