# publishing.md — publish an ADR proposal

Load this when the user requests an ADR PR or RFC discussion. Complete the [draft and review](../SKILL.md) first. A request for one publication action does not authorize every later action.

## Resolve the destination

Read `git remote -v` and use the repository the user selected. Multiple remotes alone do not require a question. Ask only if the intended destination remains unclear.

Record its owner as `ADR_OWNER` and repository name as `ADR_REPO`. Use them for the PR target, record URL, category lookup, and discussion. Add no agent attribution.

## Open the PR

1. Move the draft to `docs/adr/NNNN-<slug>.md`. Recheck the next free number before doing so.
2. Run `npm run sync:adrs` and `npm run validate:adrs`.
3. Use [caic-pr](../../caic-pr/SKILL.md) to prepare and open the requested PR. Use `docs: ADR-NNNN <title>` and put source citations in the PR description.

The ADR stays `proposed` when merged. Opening the PR does not authorize an agent to merge it or decide its status. Follow the [maintainer-owned lifecycle](../../../../docs/adr/README.md).

## Open the RFC discussion

Wait until the record exists on the selected repository's `main` branch. Verify the record URL before posting. Use the [RFC form](../../../../.github/DISCUSSION_TEMPLATE/rfc-discussions.yml): title `[RFC]: <ADR title>` and `###` headings for Record, Feedback by, and Summary. Copy the ADR's Summary into the body file.

Resolve the repository ID and its `rfc-discussions` category from the selected destination:

```bash
gh api graphql -f owner="$ADR_OWNER" -f name="$ADR_REPO" \
  -f query='query($owner:String!,$name:String!){repository(owner:$owner,name:$name){id discussionCategories(first:100){nodes{id slug}pageInfo{hasNextPage endCursor}}}}'
```

If the category is not in the first page and `hasNextPage` is true, continue with `after: endCursor`. If the repository lacks that category or discussions are disabled, report it. Do not substitute upstream or create a category without a request.

Use the returned repository ID and category ID in the mutation. Resolve all placeholders before execution:

```bash
gh api graphql -F repositoryId=<selected-repository-id> \
  -F categoryId=<selected-rfc-category-id> \
  -F title="[RFC]: <ADR title>" -F body=@<body-file> \
  -f query='mutation($repositoryId:ID!,$categoryId:ID!,$title:String!,$body:String!){createDiscussion(input:{repositoryId:$repositoryId,categoryId:$categoryId,title:$title,body:$body}){discussion{url}}}'
```

Verify that the returned URL belongs to the selected repository. If a call has an uncertain result, check for an existing discussion before retrying. Prepare the ADR's `discussion` field update in a follow-up PR when that action is requested.

## Related guidance

- [caic-adr](../SKILL.md) — read when drafting or revising the proposal
- [ADR lifecycle](../../../../docs/adr/README.md) — read when processing feedback or a maintainer decision
- [caic-pr](../../caic-pr/SKILL.md) — read when preparing the PR
