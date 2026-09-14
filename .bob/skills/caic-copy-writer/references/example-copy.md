# example-copy.md — example READMEs and comments (type 5)

Load this before writing a README or a source comment under `examples/`. Structural owner: [examples/AGENTS.md](../../../../examples/AGENTS.md).

**A developer about to copy this directory as their starting point.** Two constraints come from tooling, not taste.

- **The README's shape is machine-checked.** Title, summary, start command, and the APIs table must stay in sync with the aggregator README; regenerate with `npm run repair:example-readmes` rather than hand-patching ([Authoring rules](../../../../examples/AGENTS.md#authoring-rules)).
- **Every comment is self-contained.** No "see the basic example", no "same as the previous one but…" — the Carbon MCP indexer reads each example in isolation, so a pointer out of the directory reaches nothing.
- **Each source file opens with its purpose**: what it demonstrates, which APIs, where to start reading.
- **Non-obvious config and bus wiring take an inline _why_ comment.** The reader is about to change those lines, and the reason they read the way they do is nowhere in the code.
- Section names, order, and the bullet and table formats: [indexer-contract.md](../../../../examples/references/indexer-contract.md).

A comment in an example is not [internal-comments.md](internal-comments.md)'s no-comment-by-default tree. Here the comments are the product.

## Gate

`npm run verify:example-readmes`.

## Related guidance

- [caic-copy-writer](../SKILL.md) — the routing table and the draft-measure-revise loop
- [examples/AGENTS.md](../../../../examples/AGENTS.md) — example README shape and comment rules
- [indexer-contract.md](../../../../examples/references/indexer-contract.md) — the section and table formats the indexer reads
