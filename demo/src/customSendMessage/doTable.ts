/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageResponseTypes,
  TableItem,
} from "@carbon/ai-chat";

import { TABLE } from "./constants";
import { doText, doTextStreaming } from "./doText";

function doTable(instance: ChatInstance) {
  doTableResponse(instance);
  doText(instance, `A markdown table in the text response type.\n\n${TABLE}`);
}

async function doTableStreaming(
  instance: ChatInstance,
  requestOptions?: CustomSendMessageOptions,
) {
  await doTextStreaming(
    instance,
    `A periodic table in markdown format.\n\n${TABLE}`,
    true,
    undefined,
    undefined,
    undefined,
    undefined,
    requestOptions,
  );
}

function doTableResponse(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: "A periodic table section using the table response type instead of markdown. The table response type is experimental and may be removed when the core Carbon table is enhanced to handle narrow viewports better; allowing it to be used for a user_defined response type with much more control.",
        },
        {
          response_type: MessageResponseTypes.TABLE,
          /**
           * Optional title for the table.
           */
          title: "Periodic Elements",
          /**
           * Optional description of the table.
           */
          description:
            "Interactive periodic table data with sortable/filterable columns.",
          /**
           * The array of headers for the table.
           */
          headers: [
            "Element",
            "Symbol",
            "Atomic #",
            "Group",
            "Period",
            "Mass (u)",
            "Electron Config",
            "Bonding",
            "Melting (°C)",
            "Boiling (°C)",
          ],
          /**
           * The array of row objects for the table.
           */
          rows: [
            {
              cells: [
                "Carbon",
                "C",
                6,
                14,
                2,
                12.011,
                "[He] 2s² 2p²",
                "Covalent",
                3550,
                4027,
              ],
            },
            {
              cells: [
                "Silicon",
                "Si",
                14,
                14,
                3,
                28.085,
                "[Ne] 3s² 3p²",
                "Covalent",
                1414,
                3265,
              ],
            },
            {
              cells: [
                "Germanium",
                "Ge",
                32,
                14,
                4,
                72.63,
                "[Ar] 3d¹⁰ 4s² 4p²",
                "Covalent",
                938,
                2833,
              ],
            },
            {
              cells: [
                "Tin",
                "Sn",
                50,
                14,
                5,
                118.71,
                "[Kr] 4d¹⁰ 5s² 5p²",
                "Metallic",
                232,
                2602,
              ],
            },
            {
              cells: [
                "Lead",
                "Pb",
                82,
                14,
                6,
                207.2,
                "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²",
                "Metallic",
                327,
                1749,
              ],
            },
            {
              cells: [
                "Hydrogen",
                "H",
                1,
                1,
                1,
                1.008,
                "1s¹",
                "Covalent",
                -259,
                -253,
              ],
            },
            {
              cells: [
                "Helium",
                "He",
                2,
                18,
                1,
                4.003,
                "1s²",
                "Noble",
                -272,
                -269,
              ],
            },
            {
              cells: [
                "Lithium",
                "Li",
                3,
                1,
                2,
                6.94,
                "[He] 2s¹",
                "Metallic",
                180,
                1342,
              ],
            },
            {
              cells: [
                "Beryllium",
                "Be",
                4,
                2,
                2,
                9.012,
                "[He] 2s²",
                "Metallic",
                1287,
                2468,
              ],
            },
            {
              cells: [
                "Boron",
                "B",
                5,
                13,
                2,
                10.81,
                "[He] 2s² 2p¹",
                "Covalent",
                2075,
                4000,
              ],
            },
            {
              cells: [
                "Nitrogen",
                "N",
                7,
                15,
                2,
                14.007,
                "[He] 2s² 2p³",
                "Covalent",
                -210,
                -196,
              ],
            },
            {
              cells: [
                "Oxygen",
                "O",
                8,
                16,
                2,
                15.999,
                "[He] 2s² 2p⁴",
                "Covalent",
                -218,
                -183,
              ],
            },
            {
              cells: [
                "Fluorine",
                "F",
                9,
                17,
                2,
                18.998,
                "[He] 2s² 2p⁵",
                "Covalent",
                -220,
                -188,
              ],
            },
            {
              cells: [
                "Neon",
                "Ne",
                10,
                18,
                2,
                20.18,
                "[He] 2s² 2p⁶",
                "Noble",
                -249,
                -246,
              ],
            },
            {
              cells: [
                "Sodium",
                "Na",
                11,
                1,
                3,
                22.99,
                "[Ne] 3s¹",
                "Metallic",
                98,
                883,
              ],
            },
            {
              cells: [
                "Magnesium",
                "Mg",
                12,
                2,
                3,
                24.305,
                "[Ne] 3s²",
                "Metallic",
                650,
                1090,
              ],
            },
            {
              cells: [
                "Aluminum",
                "Al",
                13,
                13,
                3,
                26.982,
                "[Ne] 3s² 3p¹",
                "Metallic",
                660,
                2519,
              ],
            },
            {
              cells: [
                "Phosphorus",
                "P",
                15,
                15,
                3,
                30.974,
                "[Ne] 3s² 3p³",
                "Covalent",
                44,
                281,
              ],
            },
            {
              cells: [
                "Sulfur",
                "S",
                16,
                16,
                3,
                32.065,
                "[Ne] 3s² 3p⁴",
                "Covalent",
                115,
                445,
              ],
            },
            {
              cells: [
                "Chlorine",
                "Cl",
                17,
                17,
                3,
                35.453,
                "[Ne] 3s² 3p⁵",
                "Covalent",
                -102,
                -34,
              ],
            },
            {
              cells: [
                "Argon",
                "Ar",
                18,
                18,
                3,
                39.948,
                "[Ne] 3s² 3p⁶",
                "Noble",
                -189,
                -186,
              ],
            },
          ],
        } as unknown as TableItem,
      ],
    },
  });
}

export { doTable, doTableStreaming };
