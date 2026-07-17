#!/usr/bin/env node

/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";

const fs = require("fs");
const { execSync } = require("child_process");

/**
 * Public packages published under the `alpha` dist-tag. Each is versioned
 * independently: its alpha number is derived from what is already on npm, so
 * repeated alpha runs increment (alpha.0 -> alpha.1) without relying on any git
 * tag or committed version bump.
 */
const PACKAGES = [
  {
    name: "@carbon/ai-chat-components",
    dir: "packages/ai-chat-components",
    envKey: "COMPONENTS_ALPHA",
  },
  {
    name: "@carbon/ai-chat",
    dir: "packages/ai-chat",
    envKey: "AI_CHAT_ALPHA",
  },
];

const bump = process.env.BUMP === "patch" ? "patch" : "minor";

/**
 * Returns the base release version the alpha is a preview of: the next minor
 * (or patch) after the package's current stable version. e.g. 1.17.0 -> 1.18.0.
 *
 * @param {string} version The current package.json version.
 * @returns {string} The base version for the alpha prerelease.
 */
function nextBase(version) {
  const [major, minor, patch] = version.split("-")[0].split(".").map(Number);
  return bump === "patch"
    ? `${major}.${minor}.${patch + 1}`
    : `${major}.${minor + 1}.0`;
}

/**
 * Returns every version currently published for the given package, or an empty
 * array if the package has never been published.
 *
 * @param {string} name The npm package name.
 * @returns {string[]} The published versions.
 */
function publishedVersions(name) {
  try {
    const output = execSync(`npm view ${name} versions --json`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const parsed = JSON.parse(output);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    // Package or its versions are not on the registry yet: start fresh.
    return [];
  }
}

/**
 * Computes the next alpha version for a package: `<base>-alpha.<n>`, where `n`
 * is one greater than the highest alpha already published for that base.
 *
 * @param {{ name: string, dir: string }} pkg The package descriptor.
 * @returns {string} The next alpha version to publish.
 */
function computeAlpha(pkg) {
  const { version } = JSON.parse(
    fs.readFileSync(`${pkg.dir}/package.json`, "utf8"),
  );
  const base = nextBase(version);
  const alphaPattern = new RegExp(
    `^${base.replace(/\./g, "\\.")}-alpha\\.(\\d+)$`,
  );
  let highest = -1;
  for (const published of publishedVersions(pkg.name)) {
    const match = alphaPattern.exec(published);
    if (match) {
      highest = Math.max(highest, Number(match[1]));
    }
  }
  return `${base}-alpha.${highest + 1}`;
}

const envLines = [];
for (const pkg of PACKAGES) {
  const alpha = computeAlpha(pkg);
  envLines.push(`${pkg.envKey}=${alpha}`);
  console.log(`${pkg.name} -> ${alpha}`);
}

// Expose the computed versions to later GitHub Actions steps.
if (process.env.GITHUB_ENV) {
  fs.appendFileSync(process.env.GITHUB_ENV, `${envLines.join("\n")}\n`);
}
