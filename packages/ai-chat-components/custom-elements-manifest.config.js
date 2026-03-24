/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

export default {
  globs: ["src/**/*.ts"],
  exclude: ["**/__stories__"],
  outdir: ".",
  litelement: true,
  packagejson: false,
  plugins: [
    {
      name: "carbon-element-tag",
      analyzePhase({ ts, node, moduleDoc }) {
        if (!ts.isClassDeclaration(node) || !node.name) {
          return;
        }

        const decorators =
          (typeof ts.getDecorators === "function"
            ? ts.getDecorators(node)
            : node.decorators) ?? [];

        // Helper function to extract tag name from decorator argument
        const extractTagName = (arg, sourceFile) => {
          // Handle string literals: @carbonElement("cds-aichat-chat-header")
          if (ts.isStringLiteral(arg)) {
            return arg.text;
          }

          // Handle template literals without substitutions: @carbonElement(`cds-aichat-shell`)
          if (ts.isNoSubstitutionTemplateLiteral(arg)) {
            return arg.text;
          }

          // Handle template expressions: @carbonElement(`${prefix}-shell`)
          if (ts.isTemplateExpression(arg)) {
            let tagName = "";

            // Process the head (text before first ${})
            tagName += arg.head.text;

            // Process each template span
            for (const span of arg.templateSpans) {
              // Check if the expression is an identifier named "prefix"
              if (
                ts.isIdentifier(span.expression) &&
                span.expression.text === "prefix"
              ) {
                // Replace ${prefix} with the actual prefix value
                tagName += "cds-aichat";
              } else {
                // For other expressions, try to get the text
                tagName += span.expression.getText(sourceFile);
              }
              // Add the literal text after the expression
              tagName += span.literal.text;
            }

            return tagName;
          }

          return null;
        };

        const decorator = decorators.find((decorator) => {
          if (!ts.isCallExpression(decorator.expression)) {
            return false;
          }

          const expression = decorator.expression.expression;
          const decoratorName = ts.isIdentifier(expression)
            ? expression.text
            : ts.isPropertyAccessExpression(expression)
              ? expression.name.text
              : undefined;

          return (
            decoratorName === "carbonElement" &&
            decorator.expression.arguments.length > 0
          );
        });

        if (!decorator || !ts.isCallExpression(decorator.expression)) {
          return;
        }

        const arg = decorator.expression.arguments[0];
        const sourceFile = node.getSourceFile();
        const tagName = extractTagName(arg, sourceFile);

        if (!tagName) {
          return;
        }

        moduleDoc.declarations ??= [];
        const declaration = moduleDoc.declarations.find(
          (decl) => decl?.name === node.name?.text,
        );
        if (declaration) {
          declaration.tagName = tagName;
        }
      },
    },
    {
      name: "internal-members",
      analyzePhase({ ts, node, moduleDoc }) {
        // Handle class members (fields, methods, properties)
        if (!ts.isClassDeclaration(node) || !node.name) {
          return;
        }

        const className = node.name.text;
        moduleDoc.declarations ??= [];
        const classDeclaration = moduleDoc.declarations.find(
          (decl) => decl?.name === className,
        );

        if (!classDeclaration || !classDeclaration.members) {
          return;
        }

        // Check each member for @internal JSDoc tag
        node.members.forEach((member) => {
          const memberName = member.name?.getText();
          if (!memberName) {
            return;
          }

          // Get JSDoc comments for this member
          const jsDocTags = ts.getJSDocTags(member);
          const hasInternalTag = jsDocTags.some(
            (tag) => tag.tagName.text === "internal",
          );

          if (hasInternalTag) {
            // Find the corresponding member in the manifest
            const manifestMember = classDeclaration.members.find(
              (m) => m.name === memberName,
            );

            if (manifestMember) {
              // Mark as private to hide from Storybook
              manifestMember.privacy = "private";
            }
          }
        });
      },
    },
  ],
};
