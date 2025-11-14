/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { MessageResponseTypes } from "@carbon/ai-chat";

export const MARKDOWN_WITH_TABLE_AND_CODE = `
Here is a summary of the components that should lazy-load inside Jest:

| Component | Purpose | Lazy dependency |
| --- | --- | --- |
| Code snippet | Streams highlighted code | CodeMirror runtime |
| Table | Renders markdown tables | Carbon DataTable + pagination |

\`\`\`javascript
function helloLazyLoad() {
  console.log("CodeMirror + table runtime are ready!");
}

helloLazyLoad();
\`\`\`
`;

export const CITATIONS_TOGGLE_ARIA_LABEL = "Open or close the list of sources";

export const WAIT_FOR_TIMEOUT = 5_000;
export const TEST_TIMEOUT = 15_000;

export const CONVERSATIONAL_SEARCH_RESPONSE = {
  response_type: MessageResponseTypes.CONVERSATIONAL_SEARCH,
  text: "Carbon exists in multiple allotropes including diamond, graphite, and fullerenes. Diamond was first synthesized artificially in 1955, while fullerenes were discovered in 1985, and graphene was first isolated in 2004 by Andre Geim and Konstantin Novoselov at the University of Manchester.",
  citations: [
    {
      title: "Carbon Allotropes - Chemical Database (IBM Research)",
      text: "Diamond was first synthesized artificially in 1955, while fullerenes were discovered in 1985, and graphene was first isolated in 2004 by Andre Geim and Konstantin Novoselov.",
      url: "https://ibm.com/research/carbon-allotropes#:~:text=Diamond%20was%20first,University%20of%20Manchester",
      ranges: [{ start: 147, end: 290 }],
    },
    {
      title: "Carbon Element History - Chemical Elements Database (IBM Watson)",
      text: "Carbon was first recognized as an element by Antoine Lavoisier in 1789, though carbon compounds have been known since ancient times.",
      url: "https://ibm.com/chemistry/elements/carbon#:~:text=Antoine%20Lavoisier%201789",
      ranges: [{ start: 0, end: 137 }],
    },
    {
      title:
        "Carbon Research Database - Internal Collection (IBM Quantum Network)",
      text: "Carbon exists in multiple allotropes including diamond, graphite, and fullerenes. Diamond was first synthesized artificially in 1955, while fullerenes were discovered in 1985.",
      search_result_idx: 0,
      ranges: [{ start: 138, end: 247 }],
    },
  ],
  search_results: [
    {
      body: `Carbon exists in multiple allotropes including diamond, graphite, and fullerenes. Diamond was first synthesized artificially in 1955, while fullerenes were discovered in 1985, and graphene was first isolated in 2004 by Andre Geim and Konstantin Novoselov at the University of Manchester.

Carbon forms the backbone of organic chemistry due to its ability to form four covalent bonds and create long chains and complex structures. The element has an atomic number of 6 and is located in group 14 of the periodic table.

Carbon nanotubes, another important allotrope, exhibit remarkable mechanical and electrical properties. These cylindrical structures were first discovered in 1991 and have applications in electronics, materials science, and nanotechnology.

Isotopes of carbon include carbon-12, carbon-13, and carbon-14. Carbon-14 is radioactive and is used in carbon dating to determine the age of organic materials up to about 50,000 years old.`,
    },
  ],
} as const;
