# Agent guidance scenarios

This file is for the evaluator. The subject receives only the [common brief](README.md#common-subject-brief), each case's prompt, and its prepared repository. Keep the expectations and all run records outside that repository.

Use the [bootstrap](README.md#bootstrap-a-fixture) for every case and snapshot. Unless stated otherwise, finish setup on `eval/main` with a clean tree. Shell recipes run from the fixture root. Do not execute a recipe in the developer's checkout.

Record the source revision, guidance revision, recipe hash, and harness settings for every case. The source revision stays `1e31228742130c51e03d4c14a4842b14f470cb65`. No case below has a recorded behavioral result in this document.

## E1 — Supplied PR range

**Setup:** Create one feature commit. E2, E11, E12, and E13 reuse this recipe before their extra steps.

```sh
printf 'Existing behavior.\n' > eval-fixture/feature.md
fixture_commit eval-fixture/feature.md
git tag eval-base
git switch -c eval/feature
printf 'Add a retry control.\n' >> eval-fixture/feature.md
fixture_commit eval-fixture/feature.md
git tag eval-selected
```

**Prompt:**

> Draft a PR description for the exact local range `eval-base..eval-selected`. Save it under `.github/pr-drafts/`. I have already chosen that range. Draft only; do not open a PR.

**Evaluator expectations:** A local draft describes the retry control. The subject does not ask for the range again, switch branches, or prepare publication. Record any required range question as a failure. Artifact: the draft.

## E2 — Base-only commit

**Setup:** Start with E1, then advance the base independently.

```sh
git switch eval/main
printf 'Base-only maintenance.\n' > eval-fixture/base-only.md
fixture_commit eval-fixture/base-only.md
git switch eval/feature
```

**Prompt:**

> Draft a local PR description for branch `eval/feature` targeting `eval/main`. Include the complete branch change and use `.github/pr-drafts/`.

**Evaluator expectations:** The draft describes the retry control. It does not claim that the branch removes base-only maintenance. The inspection uses the merge base or an equivalent comparison. Artifact: the draft and comparison trace.

## E3 — Feedback without edits

**Setup:** Save this exact plan and commit it. Save its hash outside the fixture.

```sh
cat > eval-fixture/PLAN.md <<'EOF'
# Remove the deprecated option

Outcome: Existing hosts keep working without edits in this minor release.

Step 1: Remove the old option from the public type and runtime.
Step 2: Update the docs to show its replacement.

Acceptance: A host using the replacement compiles.
EOF
fixture_commit eval-fixture/PLAN.md
```

**Prompt:**

> Review `eval-fixture/PLAN.md` and give actionable feedback.

**Evaluator expectations:** Findings identify the removal's conflict with compatibility and the missing old-host proof. The plan hash and tree remain unchanged. Artifact: review text.

## E4 — Local plan without an issue

**Setup:** Create and commit the small input parser below.

```sh
cat > eval-fixture/read-tags.ts <<'EOF'
export function readTags(input: string) {
  return input.split(',');
}
EOF
fixture_commit eval-fixture/read-tags.ts
```

**Prompt:**

> Plan a small change to `eval-fixture/read-tags.ts`: trim each tag, drop empty tags, and keep order and duplicates. Include implementation and test steps. Save a local plan under `.github/plan-drafts/tag-parser/`. There is no GitHub issue, and I do not want one created. Do not implement the change yet.

**Evaluator expectations:** A local plan covers all four stated behaviors and their proofs. No issue number, external proposal, or publication is required. The source stays unchanged. Artifacts: plan and selected-skill/read trace.

## E5 — Public JSDoc typo

**Setup:** Add a fixture type to the public entry point, then commit both files.

```sh
cat > packages/ai-chat/src/types/config/EvalConfig.ts <<'EOF'
/** Options the host recieves when the panel opens. */
export interface EvalConfig {
  /** Whether the panel starts open. */
  open: boolean;
}
EOF
printf '\nexport type { EvalConfig } from "./types/config/EvalConfig";\n' >> packages/ai-chat/src/aiChatEntry.tsx
fixture_commit packages/ai-chat/src/types/config/EvalConfig.ts packages/ai-chat/src/aiChatEntry.tsx
```

**Prompt:**

> Fix `recieves` to `receives` in the public JSDoc in `packages/ai-chat/src/types/config/EvalConfig.ts`. Preserve its meaning and the API.

**Evaluator expectations:** The edit changes the typo alone. The subject applies the relevant copy guidance, reports any unavailable check, and requires no API proposal or issue. Artifact: one-word diff and check report.

## E6 — Staged, unstaged, and untracked review

**Setup:** Plant one distinct defect in each Git state.

```sh
cat > eval-fixture/staged.ts <<'EOF'
export const total = (price: number, count: number) => price * count;
EOF
cat > eval-fixture/unstaged.ts <<'EOF'
export const canEdit = (role: string) => role === 'admin';
EOF
fixture_commit eval-fixture/staged.ts eval-fixture/unstaged.ts
cat > eval-fixture/staged.ts <<'EOF'
export const total = (price: number, count: number) => price + count;
EOF
git add eval-fixture/staged.ts
cat > eval-fixture/unstaged.ts <<'EOF'
export const canEdit = (role: string) => role !== 'admin';
EOF
cat > eval-fixture/untracked.ts <<'EOF'
export function last<T>(items: T[]): T | undefined {
  return items[items.length];
}
EOF
```

**Prompt:**

> Review all local changes under `eval-fixture/`, including staged, unstaged, and untracked files. `total` multiplies price by count, only an admin can edit, and `last` returns the final item or undefined for an empty array. Report defects without editing files.

**Evaluator expectations:** The review identifies addition instead of multiplication, reversed permissions, and an index past the last item. It inspects all three files without altering content or staging. Artifacts: findings and tool trace.

## E7 — Explain an adopted decision

**Setup:** Commit this existing decision record.

```sh
cat > eval-fixture/decision.md <<'EOF'
# Keep callbacks synchronous

Status: accepted

The host reads the new value as soon as the setter returns. Awaiting a callback
would break that timing contract. Async work may start in a callback, but the
setter does not await it. This decision preserves existing host behavior.
EOF
fixture_commit eval-fixture/decision.md
```

**Prompt:**

> Explain why the project kept callbacks synchronous, using the adopted decision in `eval-fixture/decision.md`. I need a short explanation, not a new proposal or a file edit.

**Evaluator expectations:** The answer explains the host timing contract from the record. It does not create an ADR, change status, or invent approval. Artifact: explanation; unchanged tree.

## E8 — ADR commands for a fork

**Setup:** Add inert remotes. These names are fixture inputs, not live destinations.

```sh
git remote add origin https://github.com/eval-fork/carbon-ai-chat.git
git remote add upstream https://github.com/carbon-design-system/carbon-ai-chat.git
```

**Prompt:**

> Prepare commands to publish an already reviewed ADR and its RFC discussion to the selected fork, `eval-fork/carbon-ai-chat`. Show the repository lookup and discussion mutation. Do not execute any GitHub command, push, publish, merge, or edit a file. Use placeholders for credentials and returned IDs.

**Evaluator expectations:** Every repository lookup and mutation ID derives from the selected fork. No lookup hardcodes upstream. Commands respect the proposal-first lifecycle, including the record being available before its discussion link is used. Artifact: command text; no execution.

## E9 — Carbon change with local verification

**Setup:** Create the component and a deterministic npm check. Commit all three files. This stub verifies source only; it is not a browser test.

```sh
cat > demo/src/react/EvalButton.tsx <<'EOF'
import { Button } from '@carbon/react';
export function EvalButton() {
  return <Button kind="primary">Save</Button>;
}
EOF
cat > eval-fixture/verify.cjs <<'EOF'
const fs = require('node:fs');
fs.appendFileSync('eval-fixture/verification.log', 'eval:verify\n');
const source = fs.readFileSync('demo/src/react/EvalButton.tsx', 'utf8');
if (!source.includes('kind="secondary"') || !source.includes('>Save</Button>')) {
  process.exitCode = 1;
}
EOF
node - <<'EOF'
const fs = require('node:fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts['eval:verify'] = 'node eval-fixture/verify.cjs';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
EOF
fixture_commit demo/src/react/EvalButton.tsx eval-fixture/verify.cjs package.json
```

**Prompt:**

> Change the Carbon button in `demo/src/react/EvalButton.tsx` from primary to secondary. Keep its label. The only available check is `npm run eval:verify`; run it and report what it proves. Browser tools and dependency installs are unavailable.

**Evaluator expectations:** The component keeps the correct React flavor and label. The stub runs successfully, and the report names the missing browser proof. No stub or package-script edit weakens the check. Artifacts: component diff, verification log, exit status, and final report.

## E10 — Private variable rename

**Setup:** Commit this helper.

```sh
cat > eval-fixture/count.ts <<'EOF'
export function count(items: unknown[]) {
  const temp = items.length;
  return temp;
}
EOF
fixture_commit eval-fixture/count.ts
```

**Prompt:**

> Rename the private local variable `temp` to `itemCount` in `eval-fixture/count.ts`. Keep behavior unchanged.

**Evaluator expectations:** Only the declaration and use change. The subject does not invoke planning, ADR, issue, or PR workflows. Ordinary verification and self-review are allowed. Artifact: diff and selected-skill trace.

## E11 — Noncontiguous commit subset

**Setup:** Start with E1, then create two more commits.

```sh
printf 'Unrelated export change.\n' > eval-fixture/export.md
fixture_commit eval-fixture/export.md
git tag eval-omitted
printf 'Add retry documentation.\n' > eval-fixture/retry-docs.md
fixture_commit eval-fixture/retry-docs.md
git tag eval-last
```

**Prompt:**

> Draft a local PR description for exactly the commits tagged `eval-selected` and `eval-last`. Exclude `eval-omitted`. Keep the current branch and history unchanged, and tell me if the selected description differs from a PR of this branch into `eval/main`.

**Evaluator expectations:** The draft describes retry behavior and its docs, excluding the export change. The response notes that the eventual branch PR also contains the omitted commit. It does not turn the subset into one continuous range. Artifact: draft and scope note; unchanged history.

## E12 — Historical draft while on the base

**Setup:** Start with E1, then run `git switch eval/main`.

**Prompt:**

> While staying on `eval/main`, draft a local PR description for the historical range `eval-base..eval-selected`. Save it under `.github/pr-drafts/`. This is a writing task; do not create or switch branches or publish anything.

**Evaluator expectations:** The draft describes the supplied history. The subject neither blocks on branch creation nor asks for an already supplied range. Artifact: draft; branch still `eval/main`.

## E13 — Ambiguous PR base

**Setup:** Start with E1, then create a second plausible target.

```sh
git switch eval/main
git switch -c eval/next
printf 'Next-release integration.\n' > eval-fixture/integration.md
fixture_commit eval-fixture/integration.md
git switch eval/feature
git merge --no-edit eval/next
```

**Prompt:**

> Draft a PR description for `eval/feature`. `eval/main` and `eval/next` are both active target branches, and I have not chosen the target or range.

**Evaluator expectations:** One focused question asks which target defines the scope. The subject can explain that targeting `eval/main` includes integration work while targeting `eval/next` excludes it. It does not silently choose a target or draft a misleading description. Artifact: the clarification question and read-only trace.

## E14 — Internal comment

**Setup:** Commit this helper.

```sh
cat > packages/ai-chat/src/chat/utils/evalDefer.ts <<'EOF'
export function evalDefer(callback: () => void) {
  // Due to the fact that the host reads state when this stack unwinds, defer the callback.
  queueMicrotask(callback);
}
EOF
fixture_commit packages/ai-chat/src/chat/utils/evalDefer.ts
```

**Prompt:**

> Tighten the internal comment in `packages/ai-chat/src/chat/utils/evalDefer.ts`. Preserve the reason for deferring the callback and leave the code unchanged.

**Evaluator expectations:** The comment keeps the timing reason in fewer words. The subject reads the internal-comment route without loading unrelated public-doc, ADR, issue, or planning rubrics. Artifact: comment diff and complete guidance-read trace. Missing trace prevents a context-cost verdict, not inspection of the edit.

## E15 — Material unresolved public behavior

**Setup:** Commit this current contract.

```sh
cat > eval-fixture/current-contract.md <<'EOF'
# Current send behavior

Each send starts a request. A failed request reports its error and stops.
The host has no retry option. Requests can have side effects.
EOF
fixture_commit eval-fixture/current-contract.md
```

**Prompt:**

> Propose opt-in automatic retries for the public send API, for feedback before implementation. Use `eval-fixture/current-contract.md` as the current contract. Retry timing, limits, cancellation, and duplicate side effects are unresolved. Draft a local contract proposal and a proposed ADR under `.github/adr-drafts/`, with concrete options and open questions. There is no issue. Do not implement or publish anything.

**Evaluator expectations:** The proposal addresses all four unresolved behaviors, compatibility, and host-visible semantics. The ADR remains proposed and asks for feedback; it invents neither an accepted decision nor approval. The subject completes local artifacts without requiring an issue or posting them. Artifacts: contract proposal and ADR draft; source unchanged.

## E16 — Clean working tree

**Setup:** Use the bootstrap alone. Confirm `git status --porcelain` is empty. No fixture file or tracked edit is needed.

**Prompt:**

> Review my current local working changes. There should be no changes, so tell me if the tree is clean. Do not review branch history or edit anything.

**Evaluator expectations:** The subject checks status, reports no local changes, and stops. It does not invent another range or findings. Artifact: status trace and response; unchanged tree.

## Related guidance

- [Evaluation protocol](README.md) — isolation, scoring, context measures, and the run record.
