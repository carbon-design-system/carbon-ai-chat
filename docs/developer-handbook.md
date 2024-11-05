# Developer Handbook

<!-- prettier-ignore-start -->
<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of Contents

- [Getting started](#getting-started)
- [Common tasks](#common-tasks)
- [Dependency management](#dependency-management)
  - [Continuous Integration](#continuous-integration)
- [Directory Structure](#package-architecture-and-layout)
- [Commit conventions](#commit-conventions)
  - [Commit message format](#commit-message-format)
  - [Type](#type)
  - [Subject](#subject)
  - [Body](#body)
  - [Footer](#footer)
  - [Examples](#examples)
- [Coding style](#coding-style)
  - [Class names](#class-names)
  - [Sass documentation](#sass-documentation)
  - [Start a new `block` or `element`?](#start-a-new-block-or-element)
  - [Red flags](#red-flags)
- [Maintainers](#maintainers)
  - [Continuous integration and deployment](#ontinuous-integration-and-eployment)
  - [Publishing](#publishing)
  - [Automated dependency updates](#automated-dependency-updates)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->
<!-- prettier-ignore-end -->

## Getting started

Carbon AI Chat is built using a collection of packages all built in the same Git
repository. You might have heard this setup described as a
[monorepo](https://en.wikipedia.org/wiki/Monorepo).

As a result, we use two pieces of tooling to help us manage installing
dependencies and publishing our packages. These include:

- [Yarn workspaces](https://yarnpkg.com/lang/en/docs/workspaces/) for handling
  dependencies across all packages
- [Lerna](https://lerna.js.org/) for publishing packages, tagging versions, and
  more

In order for you to install all the dependencies in this project, you'll need to
[install Yarn](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) and run the following
command in your terminal:

```bash
npm install
```

This will install all of the dependencies for every package in our project. In
addition, it allows us to link between packages that we are developing.

This strategy is particularly useful during development, and tooling like Lerna
will pick up on when packages are linked in this way and will automatically
update versions when publishing new versions of packages.

Next up, you'll most likely want to build all of the package files so that
things don't fail while you are working on a package. To do this, you can run
the following command:

```bash
npm run build
```

Afterwards, you should be good to go!

## Common tasks

Here are some of the top-level tasks in the root of the project that you might want to run:

| Command                                                           | Usage                                                                                                         |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `npm run build`                                                   | Uses `lerna` to run the `build` script in each package                                                        |
| `npm run clean`                                                   | Resets the state of the project by removing all `node_modules` and running the `clean` script in each package |
| `npm run ci-check`                                                | Runs a series of checks (format, license, and linting on all files in the repository)                         |
| `npm run format`, `npm run format:write`, `npm run format:staged` | Format files using Prettier, check if files have been formatted                                               |
| `npm run lint`                                                    | Run eslint on files in the project                                                                            |
| `npm run lint:license`, `npm run lint:license:staged`             | Run a license script on files across the project to ensure all files have the license at the top of the file  |
| `npm run lint:styles`                                             | Run stylelint on the scss files in the project                                                                |

### Directory Structure

```
web-componentsmonorepo-template/
├── packages/
│   └── web-components/      # Web Components package
│       ├── src/
|       |    └── components/
│       └── package.json
├── docs/                    # Documentation and guides
├── .github/                 # GitHub workflows for CI/CD
├── package.json             # Root package.json with shared dependencies
└── README.md
```

If a package in elements is shipping Sass-based files, then it will follow a
certain number of conventions.

The first convention is that each of these packages will have a `scss` folder
that contains all the Sass files for the package. For example, `@carbon/colors`
would have a folder at `@carbon/colors/scss` in the import path for Sass.

To include the entire package, there are two options within this `scss` folder:
the `index.scss` entrypoint for modules and an entrypoint for inline support.
The `index.scss` entrypoint would be found at `@carbon/colors/scss/index.scss`
and would work for teams that are using tools like eyeglass or have already
setup `node-sass`'s `includePaths` option to include `node_modules`.

The other entrypoint option is for inline support. This option will work without
having to use eyeglass or something like `node-sass`'s `includePaths` option.
Each package that ships a `scss` folder will include this entrypoint, and the
name will reflect the package name. For example, `@carbon/colors` would have an
entrypoint available at `@carbon/colors/scss/colors.scss`.

#### Entrypoint behavior

The entrypoints of our Sass packages will output CSS (side-effects) by default,
unless there is no corresponding CSS to output. These side-effects help with
quickly using a package, but sometimes an application developer will want to
control behavior in order to manage side-effects. For these cases, we expose
additional files that you can include in your project, most notably a common
`scss/mixins.scss` file.

For example, in `@carbon/colors` we can import the `carbon--colors` mixin by
importing `@carbon/colors/scss/mixins.scss`. These types of files are guaranteed
to have no, or minimal, side-effects. The only side-effects that are emitted are
global variable initializations as this is required behavior in newer versions
of Sass.

Using these `mixins.scss` entrypoints allows you as an application developer to
control when these side-effects are applied in your project.

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

### Sass documentation

[SassDoc](http://sassdoc.com) is used to document the Carbon Sass source.
SassDoc annotations start each line with `///`; do not use `///` in non-SassDoc
comments.

For consistency, capitalize types (used in `@type`, `@param`, `@return`) and
descriptions (used in `@param`, `@return`, `@deprecated`, `@example`, `@link`).

The following annotations are used:

**Required annotations**

- [Description](http://sassdoc.com/annotations/#description) - can be one line
  or multiple lines
- [`@access`](http://sassdoc.com/annotations/#access) - `public` or `private`,
  where public items make up our public API
- [`@group`](http://sassdoc.com/annotations/#group) - typically a package or
  component name
- [`@type`](http://sassdoc.com/annotations/#type) - allowed on **variables**,
  (e.g. `Map`, `Color`, `Number`)
- [`@param`](http://sassdoc.com/annotations/#parameter) - allowed on
  **functions** and **mixins**, include the type, name, and description, with a
  default value if there is one (e.g.
  `@param {Map} $breakpoints [$carbon--grid-breakpoints] - A map of breakpoints where the key is the name`)
- [`@return`](http://sassdoc.com/annotations/#return) - allowed on
  **functions**, include the type and description (e.g.
  `@return {Number} In px`)
- [`@alias`](http://sassdoc.com/annotations/#alias) - do not include the `$` if
  aliasing a variable
- [`@content`](http://sassdoc.com/annotations/#content) - allowed on **mixins**,
  describe the usage of content
- [`@deprecated`](http://sassdoc.com/annotations/#deprecated) - context around
  possible replacements or when the item will no longer be available

  **Optional annotations**

- [`@example`](http://sassdoc.com/annotations/#example) - if the usage isn't
  straight forward or there are multiple use cases
- [`@link`](http://sassdoc.com/annotations/#link) - if there's a related link to
  reference

  **Examples**

```scss
// Variable example

/// Primary interactive color; Primary buttons
/// @type Color
/// @access public
/// @group @carbon/themes
$interactive-01: map-get($carbon--theme, interactive-01) !default;

// Mixin example

/// Create the container for a grid. Will cause full-bleed for the grid unless
/// max-width properties are added with `make-container-max-widths`
/// @param {Map} $breakpoints [$carbon--grid-breakpoints] - A map of breakpoints where the key is the name
/// @access private
/// @group @carbon/grid
@mixin carbon--make-container($breakpoints: $carbon--grid-breakpoints) {
}

// Function example

/// Compute the type size for the given type scale step
/// @param {Number} $step - Type scale step
/// @return {Number} In px
/// @access public
/// @group @carbon/type
@function carbon--get-type-size($step) {
}
```

### Start a new `block` or `element`?

A nested element can use a new block name as long as the styles are independent
of the parent.

```html
<div class="cds--component">
  <button class="cds--component-button">Button</button>
</div>
```

:point_up: The `#{$prefix}--component-button` class implies that this button has
independent styles from its parent. Generally, it's preferred to start a new
block.

### Red flags

Avoid names with multiple `__element` names:

- :x: `.#{$prefix}--card__list__item`
- :white_check_mark: `.#{$prefix}--card-item`
- :white_check_mark: `.#{$prefix}--card__item`

## Maintainers

### Continuous integration and deployment

GitHub Actions is used to automate the CI/CD (Continuous Integration and Continuous Deployment) workflows directly on open PRs and deployment / publishing of packages.

Actions that are triggered upon opening a PR:

- [CI check](https://github.com/carbon-design-system/web-components-monorepo-template/actions/workflows/ci.yml): Builds, runs styleint, prettier, tests, and license checks on the changes from the PR to ensure no issues are introduced.
- [Deploy preview](https://github.com/carbon-design-system/web-components-monorepo-template/actions/workflows/deploy-previews.yml): Deploys a preview of the changes utilizing GitHub Pages. The link to the deploy preview will be commented on the PR. Once the PR has been merged, the action will automatically remove the deploy preview artifacts from GitHub Pages.

Actions triggered upon merging a PR into the `main` branch:

- [Deployment of canary Storybook environment](https://github.com/carbon-design-system/web-components-monorepo-template/actions/workflows/deploy-canary-storybook.yml): Deploys the canary Storybook environment to GitHub Pages to be used for testing.
  - There are a total of 3 testing environments:
    - Canary: Updated on every change merged to `main`
    - Staging: Updated on every publish of a release candidate
    - Latest: Production environment - updated on every full release
- [Publish of canary CDN artifacts](https://github.com/carbon-design-system/web-components-monorepo-template/actions/workflows/publish-canary-cdn.yml): Publishes canary CDN artifacts to be used for testing.

### Publishing

Publishing of packages (both to NPM and CDN artifacts) are done within GitHub Actions as well. For more information, view the [publishing-releases.md](https://github.com/carbon-design-system/web-components-monorepo-template/blob/main/docs/publishing-releases.md) documentation.

### Automated dependency updates

Both Dependabot and Renovate are configured and used to automatically check for updates in the project dependencies and detect security vulnerabilities. PRs with the dependency updates are automatically opened against `main`. Ensure there are no introduced issues with the dependency update before merging in.
