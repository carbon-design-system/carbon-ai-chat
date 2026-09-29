#!/usr/bin/env node

/**
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const child = require('child_process');
const { Command } = require('commander');

const program = new Command();

program
  .option('-f, --tagFrom <git tag from>', 'Git tag range from')
  .option('-t, --tagTo <git tag to>', 'Git tag range from');

program.parse(process.argv);

/**
 * Stores the arguments
 *
 * @type {commander.Command}
 */
const args = program.opts();

/**
 * Tag From (-f)
 *
 * @type {string}
 */
const { tagFrom } = args;

/**
 * Tag To (-t)
 *
 * @type {string}
 */
const { tagTo } = args;

const toTag = tagTo !== undefined ? tagTo : 'HEAD';

/**
 * Uses a delimiter for splitting the comments into an array
 *
 * @type {string}
 */
const delimiter = '----DELIMITER----';

// We keep a list of commits that are process-oriented that we never want to
// show up in generated changelogs
const denyList = [
  'chore(release): publish [skip ci]',
  'chore(release): v',
  'chore(docs): update API symbol index',
];

/**
 * Returns the key two copies of the same change share: the trailing PR number,
 * or the whole subject when there is none
 *
 * @param {string} subject Commit subject
 * @returns {string} Commit key
 */
function getCommitKey(subject) {
  const match = subject.match(/\(#(\d+)\)$/);
  return match ? match[1] : subject;
}

/**
 * Returns the keys of commits the previous tag already shipped but the new tag
 * cannot reach. Fixes are cherry-picked from `main` onto the release branch and
 * the release PR is squash-merged back, so the `main` copy of a shipped fix is
 * never an ancestor of the previous tag and `git log` alone lists it again.
 *
 * @returns {Set<string>} Shipped commit keys
 */
function getShippedKeys() {
  const output = child
    .execSync(`git log ${toTag}..${tagFrom} --pretty=format:"%s"`)
    .toString('utf-8');

  return new Set(output.split('\n').filter(Boolean).map(getCommitKey));
}

const shippedKeys = getShippedKeys();

/**
 * Returns back the commits in an array
 *
 * @param {string} folder Folder to get commit log for
 * @returns {string[]} Commits array of objects
 */
function getCommits(folder) {
  // Gets the git output between the two tags
  const output = child
    .execSync(
      `git log ${tagFrom}..${toTag} --pretty=format:"%s"${delimiter} -- ${folder}`
    )
    .toString('utf-8');

  // Generates the array of commit comments
  return output.split(`${delimiter}\n`);
}

/**
 * Gets the changelog content
 *
 * @param {string} pkgName Package name
 * @param {string} folder Folder for git log
 * @returns {string} Changelog content
 */
function getChangelog(pkgName, folder) {
  const packageJson = require(`.${folder}/package.json`);
  // Stores the changelog
  let changelog = `## \`${pkgName}@${packageJson.version}\`\n`;

  // Stores the list of features
  const features = [];

  // Stores the list of fixes
  const fixes = [];

  // Stores the list of chores
  const chores = [];

  const commitsInFolder = getCommits(folder);

  const commitsArray = commitsInFolder.filter((commit) => {
    for (const deny of denyList) {
      if (commit.includes(deny)) {
        return false;
      }
    }
    return !shippedKeys.has(getCommitKey(commit.replace(delimiter, '')));
  });

  commitsArray.forEach((commit) => {
    const commitParse = commit.replace(delimiter, '');
    if (commit.startsWith('feat')) {
      features.push(commitParse);
    }

    if (commit.startsWith('fix')) {
      fixes.push(commitParse);
    }

    if (
      commit.startsWith('build') ||
      commit.startsWith('ci') ||
      commit.startsWith('chore') ||
      commit.startsWith('docs') ||
      commit.startsWith('perf') ||
      commit.startsWith('refactor') ||
      commit.startsWith('revert') ||
      commit.startsWith('style') ||
      commit.startsWith('test')
    ) {
      chores.push(commitParse);
    }
  });

  if (features.length !== 0) {
    changelog += `### Features :rocket:\n`;
    features.map((feature) => {
      changelog += `- ${feature}\n`;
    });
    changelog += '\n';
  }

  if (fixes.length !== 0) {
    changelog += `### Bug fixes :bug:\n`;
    fixes.map((fix) => {
      changelog += `- ${fix}\n`;
    });
    changelog += '\n';
  }

  if (chores.length !== 0) {
    changelog += `### Housekeeping :house:\n`;
    chores.map((chore) => {
      changelog += `- ${chore}\n`;
    });
    changelog += '\n';
  }

  if (features.length === 0 && fixes.length === 0 && chores.length === 0) {
    changelog = '';
  }

  return changelog;
}

/**
 * Renders the log
 */
function generateLog() {
  let log = '';

  /**
   * if you have multiple packages, you can add them here to the `log` variable
   * and they will be formated into separate sections in the release notes
   *
   * ie:
   * log += getChangelog("@carbon/monorepo-template", "./packages/ai-chat");
   * log += getChangelog('@carbon/monorepo-template-styles','./packages/styles');
   *
   */
  log += getChangelog('@carbon/ai-chat', './packages/ai-chat');
  log += getChangelog(
    '@carbon/ai-chat-components',
    './packages/ai-chat-components'
  );

  console.log(log);

  return log;
}

generateLog();
