# Security rotation

> How the team monitors the ServiceNow portal and closes out CVEs for Carbon AI Chat

A CVE is a publicly listed security flaw in a piece of software. A scanner checks this repo every night. When one of our npm dependencies has a CVE, a record for it shows up in the ServiceNow portal. Each record has a due date.

One person each month owns every open record for this repo. They triage new records, ship the fixes, and close the records in the portal. Everyone on the team follows the same steps, so anyone can cover for anyone else.

## Find the records

Open the [Carbon AI Chat view in the portal](https://ibm.service-now.com/now/nav/ui/classic/params/target/sn_vul_product_records_list.do%3Fsysparm_query%3Dactive%253Dtrue%255Eu_product_family%253Dd536311efbb67e100ee9fbef4eefdce9). It lists every active CVE record assigned to this repo. If you can't open it or the list looks wrong, ask the team in Slack.

An empty list means there's nothing to do.

## Rotation

The owner changes on the first business day of each month. The order repeats: Ethan, Warren, David.

| Month                            | Owner  |
| :------------------------------- | :----- |
| January, April, July, October    | Ethan  |
| February, May, August, November  | Warren |
| March, June, September, December | David  |

The owner:

- Checks the portal at least twice a week, and daily when a record is near its due date.
- Triages every new record, even if someone else ends up fixing it.
- Keeps each record current until it is closed.
- Hands open records to the next owner on the first business day of the month. Post a short list in the team Slack channel with each record's due date and status.

If the owner is out, they name a cover from the team in Slack before they leave. If they can't, the next person in the order covers. Swaps between teammates are fine. Say so in Slack so the handoff stays clear.

When someone joins or leaves the team, update the table and keep the order. Months don't shift for anyone else.

### Monthly reminder

A Slack reminder posts on the first business day of each month. It names the owner and links to this page. Use this text:

> Security rotation: **{owner}** owns CVE records for Carbon AI Chat this month. Check the ServiceNow portal and hand over any open records. Steps: https://github.com/carbon-design-system/carbon-ai-chat/blob/main/docs/security-rotation.md

## Close out a CVE

Work through these steps for every record. Many records need no code change, often because `main` is already past the vulnerable version. Check step 2 before you fix anything. Run all commands from the repo root. If you haven't set up the repo yet, start with [Getting started](developer-handbook.md#getting-started) in the developer handbook.

Some terms you'll see:

| Term | Meaning |
| :-- | :-- |
| Dependency | A package our code uses. |
| Direct dependency | A package listed in one of our `package.json` files. |
| Transitive dependency | A package we don't list. One of our dependencies pulls it in. |
| Lockfile | `package-lock.json`. It pins the exact version of every package that gets installed. |
| Override | A rule in the root `package.json` that forces npm to use a given version of a package, wherever it appears. |

### 1. Triage

Triage means reading the record and deciding what to do about it. Open the record and write down:

- The CVE ID, such as `CVE-2026-118764`
- The name and version of the vulnerable package
- The fixed version, if the advisory lists one
- The severity and the due date on the record

Then decide whether the package ships to consumers:

| Where the package is used | What it means |
| :-- | :-- |
| A dependency of `@carbon/ai-chat` or `@carbon/ai-chat-components` (listed under `dependencies` or `peerDependencies`) | Ships to consumers. Fix it, then publish a patch release. |
| Only a dev, build, docs, test, or example dependency (listed under `devDependencies`, or used only in `demo/` or `examples/`) | Doesn't ship. Fix it in a normal PR. |

Not sure which one it is? Step 2 shows what pulls the package in. If you still can't tell, ask in Slack and treat it as shipping until you know.

Also check that the record still applies. Many don't. Step 2 shows how.

### 2. Find the package and check that the record applies

**Start with the version.** Records are often stale. A record can say `depA@1.0.3` is vulnerable when `main` has been on `depA@1.0.9` for weeks. Dependabot and Renovate update dependencies often, and the scan data can lag behind. If we're already on a fixed version, there's nothing to fix. If we're still inside the vulnerable range, the record is real.

Get the latest `main` and install, so what you check is current:

```sh
git checkout main && git pull
npm install
```

Replace `<package>` with the package name from the record, such as `minimatch`:

```sh
npm ls <package>       # every installed copy, and what pulls it in
npm explain <package>  # the chain from our code to the vulnerable copy
npm audit              # lists known advisories and the version that fixes each
```

`npm ls` prints a tree. Find the vulnerable version, then read up the tree to see which package pulls it in. This example is illustrative:

```text
carbon-ai-chat@0.0.0
└─┬ some-build-tool@4.2.0
  └── minimatch@10.0.0     <- the vulnerable copy
```

Here `some-build-tool` pulls in `minimatch`, so `minimatch` is a transitive dependency. If the package is listed directly under our own package, it's a direct dependency.

A package can have more than one copy. Check every version in the output, not just the first.

#### Check that the record applies

Scanner records are often out of date or wrong. Before you change any code, rule these out:

| Check | How | If so |
| :-- | :-- | :-- |
| We're past the vulnerable version | Compare each version from `npm ls <package>` to the record. For example, the record says `depA@1.0.3` is vulnerable, the advisory is fixed in `1.0.4`, and we have `1.0.9`. | Not applicable. The repo moved on. |
| We no longer install the package | `npm ls <package>` prints `(empty)`. | Not applicable. The repo moved on. |
| The record names a file or path that's gone | Search for it: `git ls-files \| grep <name>`. | Not applicable if it no longer exists. |
| The name matched, not the flaw | Read the advisory. Find the product it affects. Compare it to what our package does. A package named `php` can be a syntax-highlighting plugin and have nothing to do with a PHP flaw. | Not applicable. The scanner matched a name. |
| It's a different ecosystem | Check that the advisory is about an npm package. This repo is JavaScript and TypeScript. A flaw in PHP, Java, or Python itself doesn't reach us. | Not applicable. |

If a check says the record doesn't apply, skip to [When there's nothing to do](#when-theres-nothing-to-do). If none of them do, the record is real. Go on to step 3.

### 3. Fix it

Try the options in this order and stop at the first one that works. Each one is a bigger change than the one before.

1. **Refresh the lockfile.** If the fixed version is still allowed by the range in `package.json`, npm only needs to pick it up:

   ```sh
   npm update <package>
   ```

   You can also run `npm audit fix`. Don't run `npm audit fix --force`. It can apply breaking upgrades without asking.

2. **Bump the direct dependency.** If we list the package ourselves, raise its version in the `package.json` that lists it, then run `npm install`.
3. **Bump the parent.** If another package pulls it in, update that parent to a release that uses the fixed version, then run `npm install`. Renovate or Dependabot may already have a PR open for it. Check the open PRs first.
4. **Add an override.** If no parent has released a fix yet, add an entry to `overrides` in the root `package.json`, then run `npm install`. Name the vulnerable range so the override doesn't touch other versions:

   ```json
   "overrides": {
     "minimatch@>=7 <11.0.1": "^11.0.1"
   }
   ```

   Say why in the PR description. Remove the override once the parent ships its own fix, as in [`fix(deps): drop stale overrides`](https://github.com/carbon-design-system/carbon-ai-chat/pull/3045).

5. **Patch the package.** If no fixed release exists, you can patch it with `patch-package`. The patch files live in `patches/`. Use this only as a last resort, and open an issue or PR upstream.

### 4. Verify

Check that the vulnerable version is gone, then run the repo's checks:

```sh
npm ls <package>
npm audit
npm run build && npm run ci-check
```

- `npm ls` should list only fixed versions.
- `npm audit` should no longer list your CVE. Other advisories in the output are separate records, so don't try to fix them in the same PR unless they're the same package.
- The build and checks catch a fix that breaks something else. A bump can change behavior, so don't skip them.

If a check fails, read the error. If you can't tell whether your change caused it, run the same check on `main`. If it fails there too, it's not yours.

### 5. Open the PR

- Name the branch in kebab-case, such as `fix-minimatch-cve`.
- Title the PR in conventional-commit form and include the CVE ID, such as `fix(deps): override minimatch to 11.0.1+ for CVE-2026-118764`.
- In the description, give the CVE ID, the vulnerable and fixed versions, and which option from step 3 you used.
- Keep portal-only details out of the PR. The portal is internal, but this repo is public. Link the public advisory, not the record.

Commit and branch rules are in [conventions](../references/conventions.md).

### 6. Release if it ships

If step 1 said the package ships to consumers, merge the PR and then publish a `patch` release. Follow [Patch release](publishing-releases.md#patch-release). A dev-only fix needs no release.

### 7. Close the record

1. Wait for the nightly [Mend scan](https://github.com/carbon-design-system/carbon-ai-chat/actions/workflows/mend-scan.yml) to run after the fix is on `main` (and published, if it ships). You can also start it by hand with **Run workflow**.
2. After the run finishes, refresh the portal list. The record should show that the finding is resolved or drop off the list. Portal updates can lag the scan, so allow some time.
3. Add a work note with the fix PR link, the fixed version, and the release version if there was one.
4. Resolve the record with the portal's close flow. Do this before the due date.

If you fixed the issue, don't close the record until a scan stops reporting it. If it still reports it, the fix didn't reach what the scanner reads. Go back to step 2.

If step 2 showed that the record doesn't apply, you don't need to wait for a scan. Follow [When there's nothing to do](#when-theres-nothing-to-do).

### When there's nothing to do

Sometimes the right fix is no fix. If a check in step 2 shows the record doesn't apply, close it as not applicable. A false positive is a record about a problem we don't have. Don't change code to satisfy one.

1. Write a work note with:
   - What the record says it found
   - What you checked, and what you found, such as `npm ls <package>` showing `depA@1.0.9` when the record says `1.0.3`
   - Why that means the repo isn't affected
2. Resolve the record with the portal's not-applicable or false-positive option. The portal's wording may differ.

Here are two example notes. The first is for a stale version:

> CVE-2026-0001 affects `depA` 1.0.3 and below. `main` has `depA@1.0.9` (`npm ls depA`, checked on 2026-01-05). The fixed version is 1.0.4. Not applicable.

The second is for a name match:

> CVE-2026-0000 is a flaw in the PHP runtime. The scanner matched `example-php-highlighter`, a syntax plugin that colors PHP code blocks in markdown. It's a JavaScript package and never runs PHP. Not applicable.

Only close a record this way when you have evidence. If you're not sure, ask in Slack, and treat the record as real until you know.

### If you can't fix it

Don't leave the record untouched. Add a work note that says why, and ask for an exception in the portal before the due date. What to write depends on the case:

| Case | What to write |
| :-- | :-- |
| No fixed version exists | The advisory link, and the date you will check again |
| The code path can't be reached, or the package is dev-only | Why the repo isn't exposed |
| The fix is a breaking upgrade | The tracking issue and the planned release |

If a record is close to its due date and you're blocked, tell the team in Slack. Don't wait for the next rotation.

## Related guidance

- [Automated dependency updates](developer-handbook.md#automated-dependency-updates): Renovate and Dependabot PRs that often fix a CVE
- [Publishing releases](publishing-releases.md): the patch release steps
- [`SECURITY.md`](../SECURITY.md): how outside reporters disclose a vulnerability
