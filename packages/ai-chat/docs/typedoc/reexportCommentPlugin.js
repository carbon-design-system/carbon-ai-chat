/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/*
 * TypeDoc 0.28 resolves `export { X }` re-exports to the original declaration's
 * reflection, so any JSDoc on the re-export statement (including `@category`)
 * is dropped at render time. This plugin walks each source file's AST, finds
 * export statements with a leading JSDoc block, and copies that comment onto
 * the matching reflection — letting PublicConfig.ts (and peers) own
 * category/experimental metadata without touching the upstream package that
 * actually declares the type.
 */

import { Converter, Comment, CommentTag } from "typedoc";
import ts from "typescript";

export function load(app) {
  const programs = [];

  app.converter.on(Converter.EVENT_BEGIN, (context) => {
    programs.length = 0;
    for (const program of context.programs ?? []) {
      programs.push(program);
    }
  });

  app.converter.on(Converter.EVENT_RESOLVE_END, (context) => {
    const project = context.project;
    if (programs.length === 0) {
      return;
    }

    const byName = collectReflectionsByName(project);

    const sourceFiles = new Set();
    for (const program of programs) {
      for (const sourceFile of program.getSourceFiles()) {
        sourceFiles.add(sourceFile);
      }
    }

    for (const sourceFile of sourceFiles) {
      if (sourceFile.isDeclarationFile) {
        continue;
      }

      for (const statement of sourceFile.statements) {
        if (!ts.isExportDeclaration(statement)) {
          continue;
        }
        if (
          !statement.exportClause ||
          !ts.isNamedExports(statement.exportClause)
        ) {
          continue;
        }

        const comment = readLeadingJSDocAsComment(statement);
        if (!comment) {
          continue;
        }

        for (const element of statement.exportClause.elements) {
          const exportedName = element.name.text;
          const candidates = byName.get(exportedName);
          if (!candidates || candidates.length === 0) {
            continue;
          }
          for (const target of candidates) {
            target.comment = comment.clone();
          }
        }
      }
    }
  });
}

function collectReflectionsByName(project) {
  const map = new Map();
  const visit = (reflection) => {
    if (reflection !== project && reflection.name) {
      const list = map.get(reflection.name);
      if (list) {
        list.push(reflection);
      } else {
        map.set(reflection.name, [reflection]);
      }
    }
    for (const child of reflection.children ?? []) {
      visit(child);
    }
  };
  visit(project);
  return map;
}

const MODULE_LEVEL_TAGS = new Set([
  "packageDocumentation",
  "module",
  "showCategories",
]);

function readLeadingJSDocAsComment(node) {
  const sourceFile = node.getSourceFile();
  const leadingRanges =
    ts.getLeadingCommentRanges(sourceFile.text, node.pos) ?? [];
  const nodeStart = node.getStart(sourceFile);

  const jsDocNodes = ts.getJSDocCommentsAndTags(node).filter((n) => {
    if (!ts.isJSDoc(n)) {
      return false;
    }
    const inLeading = leadingRanges.some(
      (r) => r.pos <= n.pos && r.end <= nodeStart,
    );
    if (!inLeading) {
      return false;
    }
    const tagNames = (n.tags ?? []).map((t) => t.tagName.text);
    if (tagNames.some((name) => MODULE_LEVEL_TAGS.has(name))) {
      return false;
    }
    return true;
  });
  const jsDoc = jsDocNodes[jsDocNodes.length - 1];
  if (!jsDoc) {
    return null;
  }

  const summaryText = extractCommentText(jsDoc.comment);
  const summary = summaryText ? [{ kind: "text", text: summaryText }] : [];
  const blockTags = [];

  for (const tag of jsDoc.tags ?? []) {
    const tagName = "@" + tag.tagName.text;
    const text = extractCommentText(tag.comment);
    blockTags.push(
      new CommentTag(tagName, text ? [{ kind: "text", text }] : []),
    );
  }

  if (summary.length === 0 && blockTags.length === 0) {
    return null;
  }
  return new Comment(summary, blockTags);
}

function extractCommentText(comment) {
  if (!comment) {
    return "";
  }
  if (typeof comment === "string") {
    return comment;
  }
  if (Array.isArray(comment)) {
    return comment.map((p) => p.text ?? "").join("");
  }
  return "";
}
