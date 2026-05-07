#!/usr/bin/env node

/**
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";

const fs = require("fs");
const { promisify } = require("util");
const { program } = require("commander");
const { exec } = require("child_process");
const path = require("path");
const reLicense = require("./license-text.js");

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const execPromise = promisify(exec);
const projectRoot = path.resolve(__dirname, "..");
const sourceFilePattern = "**/*.{js,jsx,ts,tsx,scss,html}";
const allFilesSourceFilePattern = "**/*.{js,ts,tsx,scss,html}";
const ignoredFilePatterns = ["!**/*.snap.js", "!examples/**"];
const sourceFileExtensions = new Set([
  ".html",
  ".js",
  ".jsx",
  ".scss",
  ".ts",
  ".tsx",
]);
const {
  currentYear,
  reLicenseTextCurrentYear,
  reLicenseTextSingleYear,
  reLicenseTextRange,
} = reLicense;

program
  .option(
    "-c, --test-current-year",
    "Ensures the license header represents the current year",
  )
  .option(
    "-w, --write-current-year",
    "Updates the license header to represent the current year",
  )
  .option("-a, --check-all-files", "Grabs all files in the project to check")
  .argument("[paths...]", "Files or directories to check");

program.parse();

/**
 * Stores the arguments
 *
 * @type {{}}
 */
const options = program.opts();

/**
 * Converts a path from the CLI or git into a project-relative path for globby.
 *
 * @param {string} filePath The path to normalize.
 * @returns {string} The normalized project-relative path.
 */
const toProjectRelativePath = (filePath) =>
  path
    .relative(
      projectRoot,
      path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath),
    )
    .replace(/\\/g, "/");

/**
 * Checks whether a path is a source file that should have a license header.
 *
 * @param {string} filePath The project-relative file path.
 * @returns {boolean} `true` if the file should be checked.
 */
const isSupportedSourceFile = (filePath) =>
  sourceFileExtensions.has(path.extname(filePath)) &&
  !filePath.endsWith(".snap.js") &&
  !filePath.includes(".yarn/");

/**
 * Resolves CLI or git paths to source files that should be checked.
 *
 * @param {string[]} paths The paths to resolve.
 * @returns {Promise<string[]>} The project-relative source file paths.
 */
const resolveSourceFiles = async (paths) => {
  const { globby } = await import("globby");
  const normalizedPaths = paths.map(toProjectRelativePath);
  const files = await globby(normalizedPaths, {
    cwd: projectRoot,
    gitignore: true,
    onlyFiles: true,
    expandDirectories: {
      files: [sourceFilePattern],
      exclude: ["**/*.snap.js"],
    },
  });

  return [...new Set(files.filter(isSupportedSourceFile))];
};

/**
 * Checks files with the given paths for valid license text.
 *
 * @param {string[]} paths The file paths to check for valid license text.
 * @param {object} options The options.
 * @param {boolean} options.testCurrentYear `true` to see if the license text contains the current year.
 * @param {boolean} options.writeCurrentYear `true` to update the given file with the current year for the license text.
 * @param {boolean} options.checkAllFiles `true` to grab all files in the project to check.
 * @returns {Promise<void>} The promise that is fulfilled when the check finishes.
 */
const check = async (paths, options) => {
  let checkPaths = [];
  const { globby } = await import("globby");

  if (options.checkAllFiles) {
    checkPaths = await globby(
      [allFilesSourceFilePattern, ...ignoredFilePatterns],
      {
        cwd: projectRoot,
        gitignore: true,
        onlyFiles: true,
      },
    );
  } else if (options.writeCurrentYear) {
    let pathsToCheck = paths;
    if (pathsToCheck.length === 0) {
      // Fall back to staged files when the command is run directly.
      const { stdout } = await execPromise("git diff --cached --name-only");
      pathsToCheck = stdout.split("\n").filter(Boolean);
    }

    checkPaths = await resolveSourceFiles(pathsToCheck);
  } else {
    checkPaths = await resolveSourceFiles(paths);
  }

  const checkFiles = [...new Set(checkPaths.filter(isSupportedSourceFile))];
  const filesWithErrors = (
    await Promise.all(
      checkFiles.map(async (item) => {
        const filePath = path.resolve(projectRoot, item);
        const contents = await readFile(filePath, "utf8");
        const result = (
          options.testCurrentYear || options.writeCurrentYear
            ? reLicenseTextCurrentYear
            : reLicense
        ).test(contents);
        if (!result) {
          if (options.writeCurrentYear) {
            const newContents = contents
              .replace(
                reLicenseTextSingleYear,
                (match) => `${match}, ${currentYear}`,
              )
              .replace(
                reLicenseTextRange,
                (match, token) => `${token}${currentYear}`,
              );
            if (!reLicenseTextCurrentYear.test(newContents)) {
              return item;
            }
            await writeFile(filePath, newContents, "utf8");
          } else {
            return item;
          }
        }
      }),
    )
  ).filter(Boolean);
  if (filesWithErrors.length > 0) {
    throw new Error(
      `Cannot find license text in: ${filesWithErrors.join(", ")}`,
    );
  }
};

check(program.args, options).then(
  () => {
    process.exit(0);
  },
  (error) => {
    console.error(error); // eslint-disable-line no-console
    process.exit(1);
  },
);
