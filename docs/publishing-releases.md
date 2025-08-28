# Release

> How we version and release packages in the Carbon AI Chat monorepo

## Table of Contents

- [Overview](#overview)
- [Release Team](#release-team)
- [Process](#process)
  - [Prerelease](#prerelease)
  - [Subsequent prerelease](#subsequent-prerelease)
  - [Stable release](#stable-release)
  - [Post release](#post-release)
  - [Patch release](#patch-release)
- [Troubleshooting](#troubleshooting)
  - [Force publish](#force-publish)
  - [Tag already exists](#tag-already-exists)

## Overview

The team follows a time-based release model where we deliver a stable `minor`
update every two weeks. We use a release branching strategy to help maintain code quality and avoid unintended or unfinished features from slipping into releases.

The full schedule for releases is available [here](link-to-wiki-page-with-release-schedule).

We publish prereleases before every `minor` release. This prerelease
happens several days before the stable release. This offers an integration
window where the prerelease can be tested on products before the stable release.

We ship security and bug fixes in `patch` releases. This will be shipped
as-needed and do not follow a specific schedule.

## Release Team

The release team is responsible for coordinating the `minor` and `patch`
releases in a given week. This group is composed of a release lead and sidekick.
The release lead is responsible for:

- Managing the release itself, including
  - Testing
  - Publishing
  - Support
- Helping the release sidekick understand and run through the release process,
  where appropriate

The release sidekick is responsible for:

- Learning how to run the release process if this is your first time on the
  release team
- Helping out the release lead in the release process, this includes helping
  with testing, publishing, support, and more

## Process

When going through a release, the release team will go through the following
checkpoints:

| Checkpoint                                      | Description                                                                                                              |
| :---------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------- |
| [Prerelease](#prerelease)                       | Publish a prerelease that will be used to test out the release candidate before becoming stabilized                      |
| [Subsequent prerelease](#subsequent-prerelease) | Publish a subsequent prerelease with any fixes added to the release branch                                               |
| [Stable release](#stable-release)               | Graduate the prerelease into a stable release that is available through packages on NPM                                  |
| [Post release](#post-release)                   | Support the latest stable release and address any issues that may come up as a result of promoting the release to stable |
| [Patch release](#patch-release)                 | Publish a patch release with hot fixes to the full release                                                               |

### Prerelease

The prerelease occurs on the first Monday of a sprint. During this stage, the
release team will need to do the following:

- [ ] Initiate code freeze by creating a release branch from `main`
  - This can be done through the GitHub UI
  - Make sure the branch name follows the `release/vx.x.x` format
    ![Screenshot of manually creating release branch from GitHub UI](https://github.com/user-attachments/assets/d4247f09-b1ab-4903-a504-938ddece03a9)

- [ ] Add branch protections to the release branch by going to 'Settings' in the repository > 'Branches' under 'Code and automation' side
      panel. Change the branch name pattern from `released/v*` to
      `release/v*`. (note the released vs. release)
      ![Screenshot of branch settings page](https://github.com/user-attachments/assets/b333d25f-6b1b-4f5f-b8db-bcd7b1e2b8a3)

- [ ] Run the
      [minor release workflow](https://github.com/carbon-design-system/carbon-ai-chat/actions/workflows/release-minor.yml)
      to generate the prerelease versions for the packages
  - [ ] Ensure the release branch is selected
  - [ ] Specify the type of release - in this case we will select
        `first minor rc` (rc stands for release candidate)
  - [ ] Ensure the dry run is checked

  ![Screenshot of minor release workflow](https://github.com/user-attachments/assets/ca511efa-47a4-41a7-95b5-c00b7688eee1)

- [ ] Once the job has completed, which it should have failed, check the
      action's log. Lerna should have logged what versions it is bumping the
      packages to. It should bump the packages up by a minor version with the
      prerelease identifier (ie. `v0.10.0 ---> v0.10.0-rc.0`).
- [ ] If the version bumps are expected, run the workflow again with the same
      inputs as above, but this time with dry run unchecked.
- [ ] Once job has completed, check the packages on npm to ensure they have been
      published under the `next` tag:
  - [ ] `@carbon/ai-chat`: https://www.npmjs.com/package/@carbon/ai-chat
- [ ] Run the
      [create github tag and PR workflow](https://github.com/carbon-design-system/carbon-ai-chat/actions/workflows/create-release-tag-and-pr.yml).
      This workflow creates the release tag, generates the release with notes,
      and opens a PR to merge the changelog and version bumps from the release
      branch to `main`.
  - [ ] Make sure to specify to release branch and the correct release versions.
        ![Screenshot of create github tag and PR workflow with options selected](https://github.com/user-attachments/assets/05ca42f4-8ec8-449e-8c42-5453e1341574)
    - The `release tag` option is the version that was just published (ie.
      v0.10.0-rc.0). Fill in the `previous tag` option with the previous full
      release (ie. v0.9.0).
  - [ ] Merge in the generated PR (the title of the PR should start with
        `chore(release):` followed by the version).
  - [ ] Check the generated
        [release](https://github.com/carbon-design-system/carbon-ai-chat/releases)
        to ensure the release notes are correct.
  - [ ] The creation and push of the tag should have triggered:
    - [ ] The [deploy staging environment workflow](https://github.com/carbon-design-system/carbon-ai-chat/actions/workflows/deploy-staging-storybook.yml).
          Once this workflow has completed, check the
          staging environment on GitHub Pages and ensure the version in the storybook top left header has been updated.
    - [ ] The [publish cdn workflow](https://github.com/carbon-design-system/carbon-ai-chat/actions/workflows/publish-cdn.yml). Once this workflow has completed, check that the CDN for the staging tag and version has been published.
- [ ] Post a message to the `#carbon-ai-chat` Slack channel to announce the
      new version of `@carbon/ai-chat`.

### Subsequent Prerelease

Once the first prerelease / release candidate has been published, it is
available for testing. If there are any issues during the testing period, fixes
can be pushed to the release branch. We can then publish subsequent prereleases
from the release branch for further testing. To publish subsequent prereleases,

- [ ] Run the
      [minor release workflow](https://github.com/carbon-design-system/carbon-ai-chat/actions/workflows/release-minor.yml)
      to generate the prerelease versions for the packages
      ![Screenshot of minor release workflow with subsequent release selected](https://github.com/user-attachments/assets/83feed4e-bd44-45e6-881e-e200d11c2cb0)
  - [ ] Ensure the release branch is selected
  - [ ] Specify the type of release - in this case we will select
        `subsequent rc`
  - [ ] Ensure the dry run is checked
- [ ] Once the job has completed, which it should have failed, check the
      action's log. Lerna should have logged what versions it is bumping the
      packages to. It should bump the packages up by the prerelease identifier
      (ie. `v0.10.0-rc.0 ---> v0.10.0-rc.1`).
- [ ] If the version bumps are expected, run the workflow again with the same
      inputs as above, but this time with dry run unchecked.
- [ ] Once job has completed, check the packages on npm to ensure they have been
      published under the `next` tag:
  - [ ]`@carbon/ai-chat`: https://www.npmjs.com/package/@carbon/ai-chat
- [ ] Run the
      [create github tag and PR workflow](https://github.com/carbon-design-system/carbon-ai-chat/actions/workflows/create-release-tag-and-pr.yml).
      This workflow creates the release tag, generates the release with notes,
      and opens a PR to merge the changelog and version bumps from the release
      branch to `main`.
  - [ ] Make sure to specify to release branch and the correct release versions.
        ![Screenshot of create github tag and PR workflow with options selected](https://github.com/user-attachments/assets/4c6ed798-24ed-4095-8802-4e0f3da64dce)
    - The `release tag` option is the version that was just published (ie.
      v0.10.0-rc.1). Fill in the `previous tag` option with the previous release
      candidate (ie. v0.10.0-rc.0)
  - [ ] Merge in the generated PR (the title of the PR should start with
        `chore(release):` followed by the version).
  - [ ] Check the generated
        [release](https://github.com/carbon-design-system/carbon-ai-chat/releases)
        to ensure the release notes are correct.
  - [ ] The creation and push of the tag should have triggered:
    - [ ] The [deploy staging environment workflow](https://github.com/carbon-design-system/carbon-ai-chat/actions/workflows/deploy-staging-storybook.yml).
          Once this workflow has completed, check the
          staging environment on GitHub Pages and ensure the version in the storybook top left header has been updated.
    - [ ] The [publish cdn workflow](https://github.com/carbon-design-system/carbon-ai-chat/actions/workflows/publish-cdn.yml). Once this workflow has completed, check that the CDN for the staging tag and version has been published.
- [ ] Post a message to the `#carbon-ai-chat` Slack channel to announce the
      new version of `@carbon/ai-chat`.
  - For **release candidates**, an example message:

  ```
  :carbon10: :carbon10: :carbon10:

  Hi all! Release candidate v0.5.0-rc.0 of `@carbon/ai-chat` has been created and is ready for testing!

  What is a release candidate? Before releasing a full version (ie. v0.5.0), we publish prerelease versions / release candidates for testing purposes. This helps to prevent any major bugs making their way to our full versions. If you find any issues with this release candidate, you can report any issues here: https://github.com/carbon-design-system/carbon-ai-chat/issues/new/choose.

  Changelog: https://github.com/carbon-design-system/carbon-ai-chat/releases/tag/v0.5.0-rc.0
  Demo (Staging): https://chat.carbondesignsystem.com/tag/next/demo/index.html
  Documentation (Staging): https://chat.carbondesignsystem.com/tag/next/docs/documents/Overview.html

  :carbon10: :carbon10: :carbon10:
  ```

### Stable release

A stable release occurs on the last Wednesday of the sprint and finishes later
in the day. This should occur after the prerelease has been tested and
validated. During this stage, the release team will do the following:

- [ ] Run the
      [minor release workflow](https://github.com/carbon-design-system/carbon-ai-chat/actions/workflows/release-minor.yml)
      to generate the full minor versions for the packages

  ![Screenshot of minor release workflow with full minor release selected](https://github.com/user-attachments/assets/9ab859fc-f25d-4c52-8f0c-71ee7adacf48)
  - [ ] Ensure the release branch is selected
  - [ ] Specify the type of release - in this case we will select
        `full minor release`
  - [ ] Ensure the dry run is checked

- [ ] Once the job has completed, which it should have failed, check the
      action's log. Lerna should have logged what versions it is bumping the
      packages to. It should bump the packages up by a minor version (ie.
      `v0.10.0-rc.1 ---> v0.10.0`).
- [ ] If the version bumps are expected, run the workflow again with the same
      inputs as above, but this time with dry run unchecked.
- [ ] Once job has completed, check the packages on npm to ensure they have been
      published under the `latest` tag:
  - [ ]`@carbon/ai-chat`: https://www.npmjs.com/package/@carbon/ai-chat
- [ ] Run the
      [create github tag and PR workflow](https://github.com/carbon-design-system/carbon-ai-chat/actions/workflows/create-release-tag-and-pr.yml).
      This workflow creates the release tag, generates the release with notes,
      and opens a PR to merge the changelog and version bumps from the release
      branch to `main`.
  - [ ] Make sure to specify to release branch and the correct release versions.
        ![Screenshot of create github tag and PR workflow with options selected](https://github.com/user-attachments/assets/33162cc1-e38f-4c86-9bc8-c0b773c86eda)
    - The `release tag` option is the version that was just published (ie.
      v0.10.0). Fill in the `previous tag` option with the previous full release
      (ie. v0.9.0)
  - [ ] Merge in the generated PR (the title of the PR should start with
        `chore(release):` followed by the version).
  - [ ] Check the generated
        [release](https://github.com/carbon-design-system/carbon-ai-chat/releases)
        to ensure the release notes are correct.
  - [ ] The creation and push of the tag should have triggered:
    - [ ] The [deploy staging environment workflow](https://github.com/carbon-design-system/carbon-ai-chat/actions/workflows/deploy-staging-storybook.yml) and the [deploy latest environment workflow](https://github.com/carbon-design-system/carbon-ai-chat/actions/workflows/deploy-latest-storybook.yml)
          Once both workflows have completed, check the
          staging and latest environments on GitHub Pages and ensure the version in the storybook top left header has been updated.
    - [ ] The [publish cdn workflow](https://github.com/carbon-design-system/carbon-ai-chat/actions/workflows/publish-cdn.yml). Once this workflow has completed, check that the CDN for the latest tag and version has been published.
  - [ ] Edit the generated release, and change the release from `pre-release` to
        `latest`.
        ![Screenshot of release label with latest option selected](https://github.com/user-attachments/assets/f3afc692-d691-4c04-b891-73d0406be7b0)

- [ ] Post a message to the `#carbon-ai-chat` Slack channel to announce the
      new version of `@carbon/ai-chat`. This message usually includes a list of features / fixes completed in the release - these can be pulled from the release changelog.
  - For **stable releases**, an example message:

    ```
    :carbon10: :carbon10: :carbon10:

    Hi all! :wave: We wanted to share the release notes for [`v0.5.0`](https://github.com/carbon-design-system/carbon-ai-chat/releases/tag/v0.5.0) :rocket:

    This release includes the following updates that you and your team can use today:

    feat: add optional ability to provide different feedback categories (#321)
    feat: properly stream web components inside streamed markdown (#301)
    feat: Response avatar and message line control (#260)
    chore: use adoptedStylesheets to set application styles to comply with CSP (#320)
    chore: replace inline styles and set them via setProperty (#305)
    chore: ensure watsonx avatar icon complies with CSP (#303)
    * ... and a number of additional bugs squashed! :bug:

    If you want to stay up to date with our release schedule, check out our [Release Radar wiki page](https://github.com/carbon-design-system/carbon-ai-chat/wiki/Carbon-AI-Chat-Releases).

    If there are any issues that come up while using this release, please reach out on GitHub or Slack to let us know!

    Thanks :tada:
    — The Carbon AI Chat team :carbon10:
    ```

- [ ] Remove the branch protections for `release/v.*` by changing the branch
      name pattern to `released/v*`

- [ ] Update the release in the
      [Wiki release page](https://github.com/carbon-design-system/carbon-ai-chat/wiki/Carbon-AI-Chat-Releases)

### Post release

After a release has switched packages from `next` to `latest`, it is important
to monitor channels on Slack and issues on GitHub in case breaking changes may
have occurred in the release.

If issues occur for the specific release, it's important to determine the next
best steps based on the type of issue. Typically, issues fall into one of two
categories:

- Hotfix: if the issue is self contained and can be addressed quickly, going
  through a patch release may be the easiest way to resolve the issue
- Revert to previous stable release: this strategy is helpful if the issue that
  has been identified is not able to be quickly remediated or the timeline is
  unknown

### Patch release

Occasionally we need to do an off-cycle patch release to fix some broken
functionality that was published in a previous release. In such cases, follow
these steps (similar to the minor release process) below to ensure a proper
patch release:

- [ ] Create a release branch from the previous release tag
  - [ ] Make sure the branch name follows the `release/vx.x.x` format. For
        example, if the last release was `v0.10.0`, the patch release branch
        name should be `release/v0.10.1`
  - [ ] This can be done through the GitHub UI. First select the previous
        release tag from the GitHub branches / tags dropdown.
        ![Screenshot of GitHub's branch/tag dropdown](https://github.com/user-attachments/assets/63a569b8-a6a4-443a-978f-13cf7835ad08)
  - [ ] Then reopen the dropdown, select the `Branches` tab, and create the
        release branch off the previously selected tag
        ![Screenshot of GitHub's branch/tag dropdown with release branch created](https://github.com/user-attachments/assets/8812cd52-b5da-495f-8f72-219367d0541f)
- [ ] Once the patch release branch has been created, open a PR(s) to merge in
      any fixes / changes needed for the patch release.
- [ ] Follow the same steps as the [prerelease](#prerelease) (skipping the
      branch creation steps as we have already created the patch release branch
      from the steps above here),
      [subsequent prerelease](#subsequent-prerelease), and
      [stable release](#stable-release) publishes, except instead of using the
      [minor release workflow](https://github.com/carbon-design-system/carbon-ai-chat/actions/workflows/release-minor.yml),
      use the
      [patch release workflow](https://github.com/carbon-design-system/carbon-ai-chat/actions/workflows/release-patch.yml)

## Troubleshooting

### Force publish

If you run into an issue where Lerna detects no changes (usually when bumping from release candidate to full release), you can run with the `force publish` option.

![Screenshot of lerna not updating due to no changes detected](https://github.com/user-attachments/assets/8c43bd62-f440-45c7-be8d-55daca9a9e4f)

Run the workflow again with both `dry run` and `force publish` options set to true so you can confirm the version bump before re-running with `force publish` set to true and `dry run` set to false.

> **Note:** when running the workflow with the `force publish` option, the workflow does not fail so make sure to cancel the workflow once it has completed running through the publish step.

![Screenshot of minor release workflow with force publish option](https://github.com/user-attachments/assets/a1535d5c-058d-4784-a46f-ae65fed3b286)

### Tag already exists

If you run into an error saying a tag already exists, that usually means the a previous job pushed out the git tags, and then failed afterwards. The current job then tries to push git tags that already exist.

![Screenshot of worfklow error due to tag already existing](https://github.com/user-attachments/assets/fc754557-5c06-4356-bad7-aef05769cdb7)

Delete the git tags by going to the [tags page on GitHub](https://github.com/carbon-design-system/carbon-ai-chat/tags) and select the `Delete tag` option in next to all the appropriate tags. Then re-run the workflow.

![Screenshot of tag page on GitHub](https://github.com/user-attachments/assets/c1c58e29-711a-4f14-81cf-9bb752be2b18)
