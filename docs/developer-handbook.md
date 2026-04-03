# Developer Handbook

<!-- prettier-ignore-start -->
## Table of Contents

- [Getting started](#getting-started)
- [Common tasks](#common-tasks)
- [Development workflow](#development-workflow)
- [Directory Structure](#directory-structure)
- [Commit conventions](#commit-conventions)
  - [Commit message format](#commit-message-format)
  - [Type](#type)
  - [Subject](#subject)
  - [Body](#body)
  - [Footer](#footer)
  - [Examples](#examples)
- [Coding style](#coding-style)
  - [Class names](#class-names)
- [Maintainers](#maintainers)
  - [Continuous integration and deployment](#continuous-integration-and-deployment)
  - [Publishing](#publishing)
  - [Automated dependency updates](#automated-dependency-updates)

<!-- prettier-ignore-end -->

## Getting started

Carbon AI Chat is built using a collection of packages all built in the same Git
repository. You might have heard this setup described as a
[monorepo](https://en.wikipedia.org/wiki/Monorepo).

As a result, we use two pieces of tooling to help us manage installing
dependencies and publishing our packages. These include:

- [NPM workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces) for handling
  dependencies across all packages
- [Lerna](https://lerna.js.org/) for publishing packages, tagging versions, and
  more

In order for you to install all the dependencies in this project, you'll need to
[install NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) and run the following
command in your terminal:

```bash
npm install
```

This will install all of the dependencies for every package in our project. In
addition, it allows us to link between packages that we are developing.

This strategy is particularly useful during development, and tooling like Lerna
will pick up on when packages are linked in this way and will automatically
update versions when publishing new versions of packages.

Next up, you'll want to build the packages before running anything:

```bash
npm run aiChat:build
```

Afterwards, you should be good to go!

## Common tasks

Here are some of the top-level tasks in the root of the project that you might want to run:

| Command                                                           | Usage                                                                                                                           |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `npm run aiChat:build`                                            | Builds `@carbon/ai-chat-components`, `@carbon/ai-chat`, and the demo in sequence                                                |
| `npm run aiChat:start`                                            | Builds both packages, then starts watch mode for both + the demo dev server (see [Development workflow](#development-workflow)) |
| `npm run build`                                                   | Uses `lerna` to run the `build` script in every package in the monorepo                                                         |
| `npm run test`                                                    | Runs the test suite across all packages via lerna                                                                               |
| `npm run clean`                                                   | Resets the state of the project by removing all `node_modules` and running the `clean` script in each package                   |
| `npm run ci-check`                                                | Runs a series of checks (format, license, and linting on all files in the repository)                                           |
| `npm run format`, `npm run format:write`, `npm run format:staged` | Format files using Prettier, check if files have been formatted                                                                 |
| `npm run lint`                                                    | Run eslint on files in the project                                                                                              |
| `npm run lint:license`, `npm run lint:license:staged`             | Run a license script on files across the project to ensure all files have the license at the top of the file                    |
| `npm run lint:styles`                                             | Run stylelint on the scss files in the project                                                                                  |

## Development workflow

### Building the packages

The examples and demo depend on the compiled output of `@carbon/ai-chat` and
`@carbon/ai-chat-components`. These packages are linked into `node_modules` via
npm workspaces, but their `exports` point to built artifacts (`dist/es/` and
`es/`) that don't exist until you run a build. After a fresh clone, always
build before starting anything:

```bash
npm run aiChat:build
```

### Starting the development environment

`npm run aiChat:start` is the primary command for active development on the
packages. It first does a full build of both packages, then concurrently starts:

- **`@carbon/ai-chat-components`**: `rollup --watch` (writes to `packages/ai-chat-components/es/`), plus Storybook on ports 6006 and 7007
- **`@carbon/ai-chat`**: `rollup --watch` (writes to `packages/ai-chat/dist/es/`), plus TypeDoc watcher and a doc server on port 5001
- **Demo**: the demo dev server

`@carbon/ai-chat`'s rollup watcher also watches `packages/ai-chat-components/es/**`, so a components rebuild automatically triggers an `@carbon/ai-chat` rebuild — you only need the one command.

```bash
npm run aiChat:start
```

### Running an example alongside the development environment

Each example in `examples/react/` and `examples/web-components/` has its own
webpack dev server. To develop against a live package build, run
`aiChat:start` in one terminal and the example in a second:

```bash
# Terminal 1
npm run aiChat:start

# Terminal 2
npm run start --workspace=@carbon/ai-chat-examples-react-custom-element
```

When `aiChat:start` rebuilds a package, the example's webpack dev server will
detect the changed files in `dist/es/` and hot-reload the browser automatically.

All examples default to port 3000. If you need to run more than one example at
the same time, override the port with the `PORT` environment variable:

```bash
PORT=3001 npm run start --workspace=@carbon/ai-chat-examples-react-basic
```

## Directory Structure

```
carbon-ai-chat/
├── packages/
│   ├── ai-chat/              # Core React chat package (@carbon/ai-chat)
│   └── ai-chat-components/   # Lit web components package (@carbon/ai-chat-components)
├── examples/
│   ├── react/                # React usage examples
│   └── web-components/       # Web component usage examples
├── demo/                     # Full demo application
├── docs/                     # Documentation and guides
├── .github/                  # GitHub workflows for CI/CD
├── package.json              # Root package.json with shared scripts and workspaces
└── README.md
```

## Commit conventions

This project follows a structured format for writing commit messages. The main
benefit of this approach is that we can use these details to automatically
generate things like changelogs, in addition to clarifying what changes
correspond to when looking at our Git history.

### Commit message format

_Parts of this section are duplicated from
[Angular's commit conventions](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#-commit-message-guidelines)_.

Each commit message consists of a **header**, a **body** and a **footer**. The
header has a specific format that includes a type, a scope and a subject:

```git
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

The **header** is mandatory and the **scope** of the header is optional. There
are a few validation rules that we also enforce, namely that:

- The header must always be fewer than **72** characters
- Any line in the commit body must be fewer than **80** characters

Most of these rules are to help with integration of `git` with common tools.

_Note: we check for this commit format using a tool called
[`commitlint`](https://commitlint.js.org/#/)_.

### Type

Must be one of the following:

- **build**: Changes that affect the build system or external dependencies
- **chore**: Changes that do not affect the meaning of the code (white-space,
  formatting, missing semi-colons, etc.)
- **ci**: Changes to our CI configuration files and scripts
- **docs**: Documentation only changes
- **feat**: A new feature
- **fix**: A bug fix
- **perf**: A code change that improves performance
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **revert**: A code change that reverses a previous commit
- **style**: Changes that affect only visual styling (CSS/SCSS) without changing logic
- **test**: Adding missing tests or correcting existing tests

### Subject

The subject contains a succinct description of the change:

- use the imperative, present tense: "change" not "changed" nor "changes"
- don't capitalize the first letter
- no dot (.) at the end

### Body

Just as in the subject, use the imperative, present tense: "change" not
"changed" nor "changes". The body should include the motivation for the change
and contrast this with previous behavior.

### Footer

The footer should contain any information about Breaking Changes.

Breaking Changes should start with the word BREAKING CHANGE: with a space or two
newlines. The rest of the commit message is then used for this.

### Examples

<details>
  <summary>Feature (`feat`)</summary>

```diff
// Adding new functionality to a piece of code is considered a feature.
// This can be seen as extending an existing API
-function MyComponent({ propA }) {
+function MyComponent({ propA, propB }) {
  // ...
}
```

</details>

<details>
  <summary>Bug fix (`fix`)</summary>

```diff
// Updating an implementation to correct a fault in the existing code is
// considered a bug fix
function add(a, b) {
-  return a - b;
+  return a + b;
}
```

</details>

<details>
  <summary>Chore (`chore`)</summary>

Running things like formatting, or generally any project clean-up tasks, can be
considered a chore that we are doing to keep things up-to-date.

</details>

## Coding style

### Class names

Prefix all class names with `#{$prefix}--` in SCSS, which is replaced with
`cds--` by default, and design systems inheriting Carbon can override. This
prefix prevents potential conflicts with class names from the user.

**HTML**

```html
<div
  class="cds--inline-notification cds--inline-notification--error"
  role="alert"
>
  <div class="cds--inline-notification__details">...</div>
</div>
```

**SCSS**

```scss
.#{$prefix}--inline-notification {
  ...
}

.#{$prefix}--inline-notification__details {
  ...
}
```

Follow BEM naming convention for classes. Again, the only thing we do
differently is prefix all classes with `#{$prefix}--`.

```scss
.#{$prefix}--block
.#{$prefix}--block__element
.#{$prefix}--block--modifier
```

Avoid nesting selectors, this will make it easier to maintain in the future.

```scss
// Don't do this
.#{$prefix}--inline-notification {
  .#{$prefix}--btn {
    &:hover {
      svg {
        ...
      }
    }
  }
}

// Do this instead
.#{$prefix}--inline-notification .#{$prefix}--btn {
    &:hover svg {
      ...
    }
  }
}
```

Use
[CSS logical properties and values](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values)
for layout. These are impacted by the writing mode and provide support for
right-to-left styling out of the box.

```scss
// Don't do this
.my-element {
  padding-top: 2em;
  padding-bottom: 2em;
  margin-left: 2em;
  position: relative;
  top: 0.2em;
}

// Do this instead
.my-element {
  padding-block-start: 2em;
  padding-block-end: 2em;
  margin-inline-start: 2em;
  position: relative;
  inset-block-start: 0.2em;
}
```

## Maintainers

### Continuous integration and deployment

GitHub Actions is used to automate the CI/CD (Continuous Integration and Continuous Deployment) workflows directly on open PRs and deployment / publishing of packages.

Actions that are triggered upon opening a PR:

- [CI check](https://github.com/carbon-design-system/carbon-ai-chat/actions/workflows/ci.yml): Builds, runs styleint, prettier, tests, and license checks on the changes from the PR to ensure no issues are introduced.
- [Deploy preview](https://github.com/carbon-design-system/carbon-ai-chat/actions/workflows/deploy-previews.yml): Deploys a preview of the changes utilizing GitHub Pages. The link to the deploy preview will be commented on the PR. Once the PR has been merged, the action will automatically remove the deploy preview artifacts from GitHub Pages.

Actions triggered upon merging a PR into the `main` branch:

- [Deployment of canary Storybook environment](https://github.com/carbon-design-system/carbon-ai-chat/actions/workflows/deploy-canary-storybook.yml): Deploys the canary Storybook environment to GitHub Pages to be used for testing.
  - There are a total of 3 testing environments:
    - Canary: Updated on every change merged to `main`
    - Staging: Updated on every publish of a release candidate
    - Latest: Production environment - updated on every full release
- [Publish of canary CDN artifacts](https://github.com/carbon-design-system/carbon-ai-chat/actions/workflows/publish-canary-cdn.yml): Publishes canary CDN artifacts to be used for testing.

### Publishing

Publishing of packages (both to NPM and CDN artifacts) are done within GitHub Actions as well. For more information, view the [publishing-releases.md](https://github.com/carbon-design-system/carbon-ai-chat/blob/main/docs/publishing-releases.md) documentation.

### Automated dependency updates

Both Dependabot and Renovate are configured and used to automatically check for updates in the project dependencies and detect security vulnerabilities. PRs with the dependency updates are automatically opened against `main`. Ensure there are no introduced issues with the dependency update before merging in.
