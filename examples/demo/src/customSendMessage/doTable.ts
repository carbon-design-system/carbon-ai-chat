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

import {
  ChatInstance,
  MessageResponseTypes,
  TableItem,
  TextItem,
} from "@carbon/ai-chat";

import { TABLE } from "./constants";
import { doText, doTextStreaming } from "./doText";

function doTable(instance: ChatInstance) {
  doTableResponse(instance);
  doText(instance, `A markdown table in the text response type.\n\n${TABLE}`);
}

async function doTableStreaming(instance: ChatInstance) {
  await doTextStreaming(
    instance,
    `A markdown table in the text response type.\n\n${TABLE}`,
    true
  );
}

function doTableResponse(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: "A table using the table response type instead of markdown.",
        } as unknown as TextItem,
        {
          response_type: MessageResponseTypes.TABLE,
          /**
           * Optional title for the table.
           */
          title: "My table",
          /**
           * Optional description of the table.
           */
          description: "My sortable/filterable table.",
          /**
           * The array of headers for the table.
           */
          headers: ["Name", "Team", "Position", "Goals", "Assists", "+/-"],
          /**
           * The array of row objects for the table.
           */
          rows: [
            {
              cells: [
                "David Pastrnak",
                "Boston Bruins",
                "Right Wing",
                48,
                47,
                "+25",
              ],
            },
            {
              cells: [
                "Connor McDavid",
                "Edmonton Oilers",
                "Center",
                40,
                79,
                "+32",
              ],
            },
            {
              cells: [
                "Leon Draisaitl",
                "Edmonton Oilers",
                "Center",
                42,
                64,
                "+28",
              ],
            },
            {
              cells: [
                "Nathan MacKinnon",
                "Colorado Avalanche",
                "Center",
                39,
                65,
                "+34",
              ],
            },
            {
              cells: [
                "Cale Makar",
                "Colorado Avalanche",
                "Defense",
                18,
                55,
                "+27",
              ],
            },
            {
              cells: [
                "Mikko Rantanen",
                "Colorado Avalanche",
                "Right Wing",
                45,
                52,
                "+23",
              ],
            },
            {
              cells: [
                "Sidney Crosby",
                "Pittsburgh Penguins",
                "Center",
                35,
                47,
                "+18",
              ],
            },
            {
              cells: [
                "Evgeni Malkin",
                "Pittsburgh Penguins",
                "Center",
                27,
                50,
                "+10",
              ],
            },
            {
              cells: [
                "Auston Matthews",
                "Toronto Maple Leafs",
                "Center",
                60,
                42,
                "+29",
              ],
            },
            {
              cells: [
                "Mitch Marner",
                "Toronto Maple Leafs",
                "Right Wing",
                29,
                60,
                "+24",
              ],
            },
            {
              cells: [
                "William Nylander",
                "Toronto Maple Leafs",
                "Right Wing",
                38,
                50,
                "+20",
              ],
            },
            {
              cells: [
                "Matthew Tkachuk",
                "Florida Panthers",
                "Left Wing",
                40,
                55,
                "+22",
              ],
            },
            {
              cells: [
                "Aleksander Barkov",
                "Florida Panthers",
                "Center",
                30,
                50,
                "+26",
              ],
            },
            {
              cells: [
                "Jack Hughes",
                "New Jersey Devils",
                "Center",
                43,
                56,
                "+21",
              ],
            },
            {
              cells: [
                "Nico Hischier",
                "New Jersey Devils",
                "Center",
                31,
                48,
                "+17",
              ],
            },
            {
              cells: [
                "Artemi Panarin",
                "New York Rangers",
                "Left Wing",
                37,
                65,
                "+30",
              ],
            },
            {
              cells: ["Adam Fox", "New York Rangers", "Defense", 15, 52, "+28"],
            },
            {
              cells: [
                "Patrick Kane",
                "Detroit Red Wings",
                "Right Wing",
                22,
                40,
                "+5",
              ],
            },
            {
              cells: [
                "Alex DeBrincat",
                "Detroit Red Wings",
                "Left Wing",
                35,
                35,
                "+10",
              ],
            },
            {
              cells: [
                "Jason Robertson",
                "Dallas Stars",
                "Left Wing",
                41,
                58,
                "+22",
              ],
            },
            { cells: ["Roope Hintz", "Dallas Stars", "Center", 37, 45, "+20"] },
            {
              cells: [
                "Kirill Kaprizov",
                "Minnesota Wild",
                "Left Wing",
                47,
                50,
                "+19",
              ],
            },
            {
              cells: [
                "Mats Zuccarello",
                "Minnesota Wild",
                "Right Wing",
                21,
                55,
                "+11",
              ],
            },
            {
              cells: [
                "Mark Scheifele",
                "Winnipeg Jets",
                "Center",
                34,
                45,
                "+16",
              ],
            },
            {
              cells: [
                "Kyle Connor",
                "Winnipeg Jets",
                "Left Wing",
                42,
                40,
                "+12",
              ],
            },
            {
              cells: [
                "Jonathan Huberdeau",
                "Calgary Flames",
                "Left Wing",
                28,
                70,
                "+15",
              ],
            },
            {
              cells: ["Nazem Kadri", "Calgary Flames", "Center", 29, 44, "+6"],
            },
            {
              cells: [
                "Brady Tkachuk",
                "Ottawa Senators",
                "Left Wing",
                35,
                40,
                "+10",
              ],
            },
            {
              cells: [
                "Tim Stützle",
                "Ottawa Senators",
                "Center",
                39,
                55,
                "+14",
              ],
            },
            {
              cells: [
                "Claude Giroux",
                "Ottawa Senators",
                "Right Wing",
                27,
                47,
                "+9",
              ],
            },
            {
              cells: [
                "Elias Pettersson",
                "Vancouver Canucks",
                "Center",
                41,
                59,
                "+20",
              ],
            },
            {
              cells: [
                "Quinn Hughes",
                "Vancouver Canucks",
                "Defense",
                12,
                60,
                "+22",
              ],
            },
            {
              cells: [
                "J.T. Miller",
                "Vancouver Canucks",
                "Center",
                32,
                45,
                "+14",
              ],
            },
            {
              cells: [
                "Bo Horvat",
                "New York Islanders",
                "Center",
                38,
                30,
                "+15",
              ],
            },
            {
              cells: [
                "Mathew Barzal",
                "New York Islanders",
                "Center",
                22,
                57,
                "+13",
              ],
            },
            {
              cells: [
                "Filip Forsberg",
                "Nashville Predators",
                "Left Wing",
                38,
                42,
                "+17",
              ],
            },
            {
              cells: [
                "Roman Josi",
                "Nashville Predators",
                "Defense",
                20,
                60,
                "+19",
              ],
            },
            {
              cells: [
                "Johnny Gaudreau",
                "Columbus Blue Jackets",
                "Left Wing",
                28,
                58,
                "+7",
              ],
            },
            {
              cells: [
                "Patrik Laine",
                "Columbus Blue Jackets",
                "Right Wing",
                35,
                30,
                "+5",
              ],
            },
            {
              cells: [
                "Sebastian Aho",
                "Carolina Hurricanes",
                "Center",
                36,
                52,
                "+21",
              ],
            },
            {
              cells: [
                "Andrei Svechnikov",
                "Carolina Hurricanes",
                "Left Wing",
                32,
                48,
                "+18",
              ],
            },
            {
              cells: [
                "Dylan Larkin",
                "Detroit Red Wings",
                "Center",
                34,
                42,
                "+11",
              ],
            },
            {
              cells: [
                "Tage Thompson",
                "Buffalo Sabres",
                "Center",
                44,
                47,
                "+20",
              ],
            },
            {
              cells: [
                "Rasmus Dahlin",
                "Buffalo Sabres",
                "Defense",
                17,
                58,
                "+13",
              ],
            },
            {
              cells: ["Trevor Zegras", "Anaheim Ducks", "Center", 27, 42, "+8"],
            },
            {
              cells: [
                "Troy Terry",
                "Anaheim Ducks",
                "Right Wing",
                30,
                40,
                "+9",
              ],
            },
          ],
        } as unknown as TableItem,
      ],
    },
  });
}

export { doTable, doTableStreaming };
