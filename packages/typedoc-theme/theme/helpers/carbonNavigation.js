/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { JSX } from "typedoc";

function itemContainsActive(item, currentUrl) {
  if (item.path === currentUrl) {
    return true;
  }

  return !!item.children?.some((child) =>
    itemContainsActive(child, currentUrl),
  );
}

function normalizeNavigationTree(navigation, projectName) {
  if (!navigation?.length) {
    return [];
  }

  const [first, ...rest] = navigation;
  if (first.text === projectName && first.children?.length) {
    return [...first.children, ...rest];
  }

  return navigation;
}

function promoteTypeReferenceCategories(tree) {
  const result = [];

  tree.forEach((item) => {
    if (item.text === "Type reference" && item.children?.length) {
      item.children.forEach((child) => {
        result.push({
          ...child,
          text: `${child.text} types`,
        });
      });
    } else {
      result.push(item);
    }
  });

  return result;
}

function renderCarbonNavItem(context, props, item, depth = 0) {
  const hasChildren = !!item.children?.length;
  const href = item.path ? context.relativeURL(item.path) : undefined;
  const isActive = item.path === props.url;
  const childHasActive =
    hasChildren &&
    item.children.some((child) => itemContainsActive(child, props.url));
  const expanded = isActive || childHasActive ? "" : undefined;

  if (!hasChildren) {
    if (!href) {
      return null;
    }

    if (depth === 0) {
      return JSX.createElement(
        "cds-side-nav-link",
        {
          href,
          active: isActive ? "" : undefined,
          "aria-current": isActive ? "page" : undefined,
        },
        item.text,
      );
    }

    return JSX.createElement(
      "cds-side-nav-menu-item",
      {
        href,
        active: isActive ? "" : undefined,
        "aria-current": isActive ? "page" : undefined,
      },
      item.text,
    );
  }

  const children = item.children
    .map((child) => renderCarbonNavItem(context, props, child, depth + 1))
    .filter(Boolean);

  if (depth === 0) {
    if (item.path) {
      return JSX.createElement(
        "cds-side-nav-menu",
        {
          title: item.text,
          expanded,
        },
        JSX.createElement(
          "cds-side-nav-menu-item",
          {
            href,
            active: isActive ? "" : undefined,
            "aria-current": isActive ? "page" : undefined,
          },
          item.text,
        ),
        ...children,
      );
    }

    return JSX.createElement(
      "cds-side-nav-menu",
      {
        title: item.text,
        expanded,
      },
      ...children,
    );
  }

  if (item.path) {
    return JSX.createElement(
      "cds-side-nav-menu",
      {
        title: item.text,
        expanded,
      },
      JSX.createElement(
        "cds-side-nav-menu-item",
        {
          href,
          active: isActive ? "" : undefined,
          "aria-current": isActive ? "page" : undefined,
        },
        item.text,
      ),
      ...children,
    );
  }

  return JSX.createElement(
    "cds-side-nav-menu",
    {
      title: item.text,
      expanded,
    },
    ...children,
  );
}

export function getNavigationGroups(context, props) {
  const navigationTree = normalizeNavigationTree(
    context.getNavigation(props.project),
    props.project.name,
  );

  const promotedTree = promoteTypeReferenceCategories(navigationTree);
  const regularItems = [];
  const typeItems = [];
  const migrationItems = [];

  promotedTree.forEach((item) => {
    // Check if this is a migration document
    if (item.text.toLowerCase().startsWith("migration")) {
      migrationItems.push(item);
    } else if (item.text.endsWith(" types")) {
      typeItems.push(item);
    } else {
      regularItems.push(item);
    }
  });

  // Build a map of document title -> order based on the order specified in
  // the typedoc config's `projectDocuments` option. By the time we see them,
  // both `project.documents` and the navigation tree have been alphabetized
  // by TypeDoc's sort, so we recover the intended order by walking
  // `project.documents`, looking up each one's source-file path via the
  // project's file registry, and matching against the configured
  // `projectDocuments` list by basename. The DocumentReflection's `name` is
  // the frontmatter title, which matches the navigation item's `text`, so
  // we key the map by title.
  const projectDocumentPaths =
    context.options.getValue("projectDocuments") || [];
  const projectDocumentBasenames = projectDocumentPaths.map((p) =>
    p.split("/").pop(),
  );
  const documentOrderMap = new Map();
  (props.project.documents || []).forEach((doc) => {
    const sourcePath = props.project.files?.getReflectionPath(doc);
    if (!sourcePath) {
      return;
    }
    const sourceBasename = sourcePath.split("/").pop();
    const orderIndex = projectDocumentBasenames.indexOf(sourceBasename);
    if (orderIndex !== -1) {
      documentOrderMap.set(doc.name, orderIndex);
    }
  });

  // Separate documents (items with defined order) from API items (no defined order)
  const documents = [];
  const apiItems = [];

  regularItems.forEach((item) => {
    if (documentOrderMap.has(item.text)) {
      documents.push(item);
    } else {
      apiItems.push(item);
    }
  });

  // Sort documents by their projectDocuments order
  documents.sort((a, b) => {
    const orderA = documentOrderMap.get(a.text);
    const orderB = documentOrderMap.get(b.text);
    return orderA - orderB;
  });

  // Combine: documents first (in specified order), then API items (alphabetically sorted by TypeDoc)
  const sortedRegularItems = [...documents, ...apiItems];

  return {
    regularItems: sortedRegularItems,
    typeItems,
    migrationItems,
  };
}

function renderVersionsDropdown() {
  // Create a wrapper div for the dropdown with padding
  return JSX.createElement(
    "div",
    {
      id: "versions-dropdown-wrapper",
      style: "padding: 1rem;",
    },
    JSX.createElement(
      "cds-dropdown",
      {
        id: "versions-dropdown",
        "title-text": "Select @carbon/ai-chat version",
        size: "sm",
      },
      // Dropdown items will be populated dynamically by versionDropdown.js
    ),
  );
}

export function carbonNavigation(context, props, groups) {
  const { regularItems, typeItems, migrationItems } =
    groups ?? getNavigationGroups(context, props);

  const renderedRegular = regularItems
    .map((item) => renderCarbonNavItem(context, props, item, 0))
    .filter(Boolean);

  const renderedTypes = typeItems
    .map((item) => renderCarbonNavItem(context, props, item, 0))
    .filter(Boolean);

  const renderedMigrations = migrationItems
    .map((item) => renderCarbonNavItem(context, props, item, 0))
    .filter(Boolean);

  const versionsDropdown = renderVersionsDropdown();

  const children = [versionsDropdown];

  if (renderedRegular.length > 0) {
    children.push(
      JSX.createElement("cds-side-nav-divider", { key: "regular-divider" }),
      ...renderedRegular,
    );
  }

  if (renderedMigrations.length > 0) {
    children.push(
      JSX.createElement("cds-side-nav-divider", { key: "migrations-divider" }),
      ...renderedMigrations,
    );
  }

  if (renderedTypes.length > 0) {
    children.push(
      JSX.createElement("cds-side-nav-divider", { key: "types-divider" }),
      ...renderedTypes,
    );
  }

  return JSX.createElement("cds-side-nav-items", null, ...children);
}
