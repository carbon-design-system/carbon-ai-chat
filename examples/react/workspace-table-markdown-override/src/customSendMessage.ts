/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock backend for the workspace-table-markdown-override example. Every
 * reply contains a single markdown table tall enough to exercise the
 * workspace shell body's scrollbar — the inline card preview paginates the
 * rows, but the workspace panel renders them all without pagination.
 */

import {
  type ChatInstance,
  type CustomSendMessageOptions,
  type MessageRequest,
  MessageResponseTypes,
} from "@carbon/ai-chat";

function row(
  id: string,
  customer: string,
  status: string,
  total: string,
): string {
  return `| ${id} | ${customer} | ${status} | ${total} |`;
}

const ROWS: string[] = [
  row("ORD-1001", "Aisha Patel", "Shipped", "$248.00"),
  row("ORD-1002", "Marcus Reed", "Processing", "$96.50"),
  row("ORD-1003", "Sofia Castillo", "Delivered", "$412.99"),
  row("ORD-1004", "Niall O'Connor", "Cancelled", "$0.00"),
  row("ORD-1005", "Priya Singh", "Shipped", "$1,089.25"),
  row("ORD-1006", "Henrik Lindqvist", "Delivered", "$57.20"),
  row("ORD-1007", "Camille Dubois", "Processing", "$324.10"),
  row("ORD-1008", "Tomás Álvarez", "Refunded", "$199.95"),
  row("ORD-1009", "Mei Chen", "Shipped", "$45.00"),
  row("ORD-1010", "Daniel Bauer", "Delivered", "$867.40"),
  row("ORD-1011", "Yara Hassan", "Processing", "$2,310.00"),
  row("ORD-1012", "Lukas Novak", "Shipped", "$73.18"),
  row("ORD-1013", "Adaora Okafor", "Delivered", "$148.75"),
  row("ORD-1014", "Pedro Rivera", "Cancelled", "$0.00"),
  row("ORD-1015", "Hiroko Tanaka", "Shipped", "$512.60"),
  row("ORD-1016", "Elias Berg", "Processing", "$84.99"),
  row("ORD-1017", "Mariam Saïd", "Delivered", "$237.45"),
  row("ORD-1018", "Connor Murphy", "Refunded", "$329.80"),
  row("ORD-1019", "Ines Fernandes", "Shipped", "$691.00"),
  row("ORD-1020", "Wei Zhang", "Delivered", "$54.30"),
  row("ORD-1021", "Mateo Rossi", "Processing", "$112.75"),
  row("ORD-1022", "Anouk Janssen", "Shipped", "$405.00"),
  row("ORD-1023", "Kofi Mensah", "Delivered", "$28.99"),
  row("ORD-1024", "Léa Moreau", "Processing", "$1,243.40"),
];

const REPLY = `Here are recent orders. The default markdown renderer for tables is replaced with a card-wrapped preview — click the maximize icon in the card's header to open the same data in the workspace panel, where it renders as a full Carbon \`DataTable\` with all rows visible and the workspace shell body providing a vertical scrollbar.

| Order | Customer | Status | Total |
| --- | --- | --- | --- |
${ROWS.join("\n")}
`;

async function customSendMessage(
  _request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: REPLY,
        },
      ],
    },
  });
}

export { customSendMessage };
