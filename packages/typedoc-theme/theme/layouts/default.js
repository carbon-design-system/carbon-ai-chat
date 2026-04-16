/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { JSX } from "typedoc";
import { extname } from "path";
import {
  carbonNavigation,
  getNavigationGroups,
} from "../helpers/carbonNavigation.js";
import {
  classNames,
  getDisplayName,
  hasTypeParameters,
} from "../helpers/helpers.js";
import { ReflectionKind } from "typedoc";

function renderBreadcrumb(context, model) {
  const path = [];
  let current = model;

  while (current.parent) {
    path.push(current);
    current = current.parent;
  }

  if (!path.length) {
    return null;
  }

  const items = path.reverse().map((reflection, index) =>
    JSX.createElement(
      "cds-breadcrumb-item",
      {
        href: (() => {
          const target = context.urlTo(reflection);
          return target || undefined;
        })(),
        "aria-current": index === path.length - 1 ? "page" : undefined,
      },
      reflection.name,
    ),
  );

  return JSX.createElement(
    "cds-breadcrumb",
    { "aria-label": "Breadcrumb" },
    ...items,
  );
}

function renderPageTitle(context, props) {
  const opts = context.options.getValue("headings");
  const renderBreadcrumbs =
    props.url !== "index.html" && props.url !== "hierarchy.html";

  let renderTitle;
  let titleKindString = "";

  if (props.model.isProject()) {
    if (props.url === "index.html" && props.model.readme?.length) {
      renderTitle = opts.readme;
    } else {
      renderTitle = true;
    }
  } else if (props.model.isDocument()) {
    renderTitle = opts.document;
  } else {
    renderTitle = true;
    titleKindString = ReflectionKind.singularString(props.model.kind) + " ";
  }

  return JSX.createElement(
    "div",
    null,
    renderBreadcrumbs && renderBreadcrumb(context, props.model),
    renderTitle &&
      JSX.createElement(
        "h1",
        { class: classNames({ deprecated: props.model.isDeprecated() }) },
        titleKindString,
        getDisplayName(props.model),
        hasTypeParameters(props.model) &&
          JSX.createElement(
            JSX.Fragment,
            null,
            "<",
            props.model.typeParameters?.map((item) => item.name).join(", "),
            ">",
          ),
        context.reflectionFlags(props.model),
      ),
  );
}

function faviconElement(context) {
  const favicon = context.options.getValue("favicon");
  if (!favicon) {
    return null;
  }

  if (/^https?:\/\//i.test(favicon)) {
    return JSX.createElement("link", { rel: "icon", href: favicon });
  }

  switch (extname(favicon)) {
    case ".ico":
      return JSX.createElement("link", {
        rel: "icon",
        href: context.relativeURL("assets/favicon.ico", true),
      });
    case ".png":
      return JSX.createElement("link", {
        rel: "icon",
        href: context.relativeURL("assets/favicon.png", true),
        type: "image/png",
      });
    case ".svg":
      return JSX.createElement("link", {
        rel: "icon",
        href: context.relativeURL("assets/favicon.svg", true),
        type: "image/svg+xml",
      });
    default:
      return null;
  }
}

function buildSiteMetadata(context, props) {
  try {
    const hostedBaseUrl = context.options.getValue("hostedBaseUrl");
    if (!hostedBaseUrl) {
      return null;
    }

    const url = new URL(hostedBaseUrl);
    if (url.pathname !== "/") {
      return null;
    }

    return JSX.createElement(
      "script",
      { type: "application/ld+json" },
      JSX.createElement(JSX.Raw, {
        html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: props.project.name,
          url: url.toString(),
        }),
      }),
    );
  } catch {
    return null;
  }
}

function pageTitle(props) {
  if (!props.model || !props.project) {
    return "Documentation";
  }

  const modelName = props.model.isProject()
    ? props.project.name
    : props.model.name || props.project.name;

  if (props.model.isProject()) {
    return modelName;
  }

  return `${modelName} | ${props.project.name}`;
}

export const defaultLayout = (context, template, props) => {
  const navigationGroups = getNavigationGroups(context, props);
  const sideNavItems = carbonNavigation(context, props, navigationGroups);

  return JSX.createElement(
    "html",
    {
      lang: context.options.getValue("lang"),
      class: "carbon-typedoc",
      "data-base": context.relativeURL("./"),
    },
    JSX.createElement(
      "head",
      null,
      JSX.createElement("meta", { charset: "utf-8" }),
      context.hook("head.begin", context),
      JSX.createElement("meta", {
        "http-equiv": "x-ua-compatible",
        content: "IE=edge",
      }),
      JSX.createElement("title", null, pageTitle(props)),
      faviconElement(context),
      props.url === "index.html" && buildSiteMetadata(context, props),
      JSX.createElement("meta", {
        name: "description",
        content: `Documentation for ${props.project.name}`,
      }),
      JSX.createElement("meta", {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      }),
      // TypeDoc default assets
      JSX.createElement("link", {
        rel: "stylesheet",
        href: context.relativeURL("assets/style.css", true),
      }),
      JSX.createElement("link", {
        rel: "stylesheet",
        href: context.relativeURL("assets/highlight.css", true),
      }),
      context.options.getValue("customCss") &&
        JSX.createElement("link", {
          rel: "stylesheet",
          href: context.relativeURL("assets/custom.css", true),
        }),
      JSX.createElement("link", {
        rel: "stylesheet",
        href: context.relativeURL("assets/carbonTheme.css", true),
      }),
      JSX.createElement("script", {
        defer: true,
        src: context.relativeURL("assets/main.js", true),
      }),
      context.options.getValue("customJs") &&
        JSX.createElement("script", {
          defer: true,
          src: context.relativeURL("assets/custom.js", true),
        }),
      JSX.createElement("script", {
        async: true,
        src: context.relativeURL("assets/icons.js", true),
        id: "tsd-icons-script",
      }),
      JSX.createElement("script", {
        async: true,
        src: context.relativeURL("assets/search.js", true),
        id: "tsd-search-script",
      }),
      JSX.createElement("script", {
        async: true,
        src: context.relativeURL("assets/navigation.js", true),
        id: "tsd-nav-script",
      }),
      JSX.createElement("script", {
        async: true,
        src: context.relativeURL("assets/hierarchy.js", true),
        id: "tsd-hierarchy-script",
      }),
      JSX.createElement("script", {
        defer: true,
        src: "https://unpkg.com/lunr@2.3.9/lunr.min.js",
      }),
      // Carbon Web Components
      JSX.createElement("script", {
        type: "module",
        src: "https://1.www.s81c.com/common/carbon/web-components/tag/latest/ui-shell.min.js",
      }),
      JSX.createElement("script", {
        type: "module",
        src: "https://1.www.s81c.com/common/carbon/web-components/tag/latest/breadcrumb.min.js",
      }),
      JSX.createElement("script", {
        type: "module",
        src: "https://1.www.s81c.com/common/carbon/web-components/tag/latest/modal.min.js",
      }),
      JSX.createElement("script", {
        type: "module",
        src: "https://1.www.s81c.com/common/carbon/web-components/tag/latest/dropdown.min.js",
      }),
      JSX.createElement("script", {
        defer: true,
        src: context.relativeURL("assets/carbonSearchModal.js", true),
      }),
      JSX.createElement("script", {
        defer: true,
        src: context.relativeURL("assets/carbonSearch.js", true),
      }),
      JSX.createElement("script", {
        defer: true,
        src: context.relativeURL("assets/redirectToOverview.js", true),
      }),
      JSX.createElement("script", {
        defer: true,
        src: context.relativeURL("assets/cookiePreferences.js", true),
      }),
      JSX.createElement("script", {
        defer: true,
        src: context.relativeURL("assets/experimentalToPreview.js", true),
      }),
      JSX.createElement("script", {
        defer: true,
        src: context.relativeURL("assets/versionDropdown.js", true),
      }),
      context.hook("head.end", context),
    ),
    JSX.createElement(
      "body",
      { class: "cds-theme-zone-white" },
      context.hook("body.begin", context),
      // Carbon UI Shell header
      JSX.createElement(
        "cds-header",
        {
          "aria-label": `${props.project.name} documentation`,
          id: "carbon-header",
        },
        JSX.createElement("cds-header-menu-button", {
          "button-label-active": "Close menu",
          "button-label-inactive": "Open menu",
        }),
        JSX.createElement(
          "cds-header-name",
          { href: context.relativeURL("index.html"), prefix: "" },
          props.project.name,
        ),
        JSX.createElement(
          "div",
          { class: "cds--header__global" },
          JSX.createElement(
            "cds-header-global-action",
            {
              "aria-label": "Search",
              "tooltip-text": "Search",
              id: "carbon-search-trigger",
            },
            JSX.createElement(
              "svg",
              {
                slot: "icon",
                xmlns: "http://www.w3.org/2000/svg",
                fill: "currentColor",
                width: "20",
                height: "20",
                viewBox: "0 0 32 32",
                "aria-hidden": "true",
              },
              JSX.createElement("path", {
                d: "M29 27.5859l-7.5521-7.5521a11.0177 11.0177 0 1 0-1.4141 1.4141L27.5859 29ZM4 13a9 9 0 1 1 9 9A9.01 9.01 0 0 1 4 13Z",
              }),
            ),
          ),
        ),
      ),
      JSX.createElement(
        "div",
        { style: "display: none" },
        context.toolbar(props),
      ),
      // Carbon UI Shell side navigation (sibling of header)
      JSX.createElement(
        "cds-side-nav",
        {
          id: "carbon-side-nav",
          "aria-label": "Side navigation",
          "collapse-mode": "responsive",
        },
        sideNavItems,
      ),
      // Main content container for Carbon UI Shell
      JSX.createElement(
        "div",
        { class: "carbon-main-content" },
        context.hook("content.begin", context),
        renderPageTitle(context, props),
        template(props),
        context.hook("content.end", context),
        context.footer(),
      ),
      // Carbon modal used to host TypeDoc search UI
      JSX.createElement(
        "cds-modal",
        {
          id: "carbon-search-modal",
          size: "md",
        },
        JSX.createElement(
          "cds-modal-header",
          null,
          JSX.createElement("cds-modal-close-button", null),
          JSX.createElement("cds-modal-heading", null, "Search documentation"),
        ),
        JSX.createElement(
          "cds-modal-body",
          null,
          JSX.createElement("div", { id: "carbon-search-content" }),
        ),
      ),
      context.hook("body.end", context),
    ),
  );
};

export { defaultLayout as default };
