/**
 *
 * IBM Confidential
 *
 * (C) Copyright IBM Corp. 2024
 *
 * The source code for this program is not published or otherwise
 * divested of its trade secrets, irrespective of what has been
 * deposited with the U. S. Copyright Office
 *
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 *
 */

const WELCOME_TEXT = `Welcome to this example of a custom backend.

This backend is mocked entirely on the client side. It does **not** show all potential functionality.

You can type **help** to see this message again.`;

const TABLE = `
| Lorem        | Ipsum      | Odor    | Amet      |
|--------------|------------|---------|-----------|
| consectetuer | adipiscing | elit    | Venenatis |
| 0            | 1          | 2       | 3         |
| bibendum     | enim       | blandit | quis      |
| consectetuer | adipiscing | elit    | Venenatis |
| 0            | 1          | 2       | 3         |
| bibendum     | enim       | blandit | quis      |
| consectetuer | adipiscing | elit    | Venenatis |
| 0            | 1          | 2       | 3         |
| bibendum     | enim       | blandit | quis      |
`;

const UNORDERED_LIST = `
- consectetuer
- adipiscing
- elit
  - sublist
  - adipiscing
  - elit
  - Venenatis
- Venenatis
- consectetuer
- adipiscing
- elit
- Venenatis
`;

const ORDERED_LIST = `
1. consectetuer
2. adipiscing
3. elit
4. Venenatis
`;

const TEXT = `Lorem **bold text** *italics text* ipsum odor amet, consectetuer adipiscing elit. \`alert("inline code");\` aliquet non platea elementum morbi porta accumsan. Tortor libero consectetur dapibus volutpat porta vestibulum.

Quam [link with target blank](https://ibm.com) scelerisque platea [link with target self](https://ibm.com){{target="_self"}} sem placerat pharetra sed. Porttitor per massa venenatis fusce fusce ad cras. Vel congue semper, rhoncus tempus nisl nam. Purus molestie tristique diam himenaeos sapien lacus.`;

const CHART_DATA = JSON.stringify({
  $schema: "https://vega.github.io/schema/vega-lite/v5.json",
  data: {
    values: [
      { category: "A", value: 20 },
      { category: "B", value: 40 },
      { category: "C", value: 60 },
    ],
  },
  mark: "bar",
  encoding: {
    x: { field: "category", type: "nominal", axis: { title: "Category" } },
    y: { field: "value", type: "quantitative", axis: { title: "Value" } },
  },
});

const WORD_DELAY = 50;

export {
  WELCOME_TEXT,
  TEXT,
  WORD_DELAY,
  CHART_DATA,
  TABLE,
  ORDERED_LIST,
  UNORDERED_LIST,
};
