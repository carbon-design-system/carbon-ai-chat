/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

const WELCOME_TEXT = `Welcome to this example of a custom back-end. This back-end is harded coded with responses to show a subset of the functionality of Carbon AI Chat.

You can type **help** to see this message again.`;

const CHAIN_OF_THOUGHT_TEXT = `Carbon's versatile bonding properties have been analyzed through multiple chemical databases to present this comprehensive overview.`;

const CHAIN_OF_THOUGHT_TEXT_STREAM = `Carbon's versatile bonding properties have been analyzed through multiple chemical databases to present this comprehensive overview. As this analysis streams in, various computational chemistry tools are querying molecular structures and periodic trends.`;

const TABLE = `
| Element      | Symbol | Atomic Number | Group | Period | Atomic Mass (u) | Electron Config | Bonding | Melting Point (°C) | Boiling Point (°C) |
|--------------|--------|---------------|-------|--------|-----------------|-----------------|---------|--------------------|--------------------|
| Carbon       | C      | 6             | 14    | 2      | 12.011          | [He] 2s² 2p²    | Covalent| 3550               | 4027               |
| Silicon      | Si     | 14            | 14    | 3      | 28.085          | [Ne] 3s² 3p²    | Covalent| 1414               | 3265               |
| Germanium    | Ge     | 32            | 14    | 4      | 72.630          | [Ar] 3d¹⁰ 4s² 4p²| Covalent| 938                | 2833               |
| Tin          | Sn     | 50            | 14    | 5      | 118.710         | [Kr] 4d¹⁰ 5s² 5p²| Metallic| 232                | 2602               |
| Lead         | Pb     | 82            | 14    | 6      | 207.200         | [Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²| Metallic| 327          | 1749               |
| Flerovium    | Fl     | 114           | 14    | 7      | 289             | [Rn] 5f¹⁴ 6d¹⁰ 7s² 7p²| Unknown | Unknown      | Unknown            |
| Hydrogen     | H      | 1             | 1     | 1      | 1.008           | 1s¹             | Covalent| -259               | -253               |
| Helium       | He     | 2             | 18    | 1      | 4.003           | 1s²             | Noble   | -272               | -269               |
| Lithium      | Li     | 3             | 1     | 2      | 6.940           | [He] 2s¹        | Metallic| 180                | 1342               |
| Beryllium    | Be     | 4             | 2     | 2      | 9.012           | [He] 2s²        | Metallic| 1287               | 2468               |
| Boron        | B      | 5             | 13    | 2      | 10.810          | [He] 2s² 2p¹    | Covalent| 2075               | 4000               |
| Nitrogen     | N      | 7             | 15    | 2      | 14.007          | [He] 2s² 2p³    | Covalent| -210               | -196               |
| Oxygen       | O      | 8             | 16    | 2      | 15.999          | [He] 2s² 2p⁴    | Covalent| -218               | -183               |
| Fluorine     | F      | 9             | 17    | 2      | 18.998          | [He] 2s² 2p⁵    | Covalent| -220               | -188               |
| Neon         | Ne     | 10            | 18    | 2      | 20.180          | [He] 2s² 2p⁶    | Noble   | -249               | -246               |
`;

const UNORDERED_LIST = `
- Carbon allotropes
- Diamond
- Graphite
  - Graphene layers
  - Hexagonal structure
  - Electrical conductivity
  - Thermal properties
- Fullerenes
- Carbon nanotubes
- Amorphous carbon
- Coal
- Activated carbon
`;

const ORDERED_LIST = `
1. Carbon bonding types
  1. Single bonds (sp³)
  2. Double bonds (sp²)
2. Triple bonds (sp)
3. Aromatic bonding
4. Metallic carbides
`;

const TEXT = `Carbon is a **chemical element** with the *atomic number* 6 and symbol **C**. \`C + O₂ → CO₂\` represents one of carbon's most fundamental reactions.

Carbon forms [covalent bonds](https://ibm.com) through electron sharing and creates [carbon chains](https://ibm.com){{target="_self"}} that are essential for organic molecules.

`;

const HEADERS = `
# Header 1 sized header
${TEXT}

## Header 2 sized header
${TEXT}

### Header 3 sized header
${TEXT}
`;

const CODE =
  "\n```python\n" +
  `import periodictable
from rdkit import Chem

def analyze_carbon_compounds(smiles_list):
    # Analyze carbon-containing molecules
    carbon = periodictable.C
    results = []
    
    for smiles in smiles_list:
        mol = Chem.MolFromSmiles(smiles)
        if mol:
            carbon_count = sum(1 for atom in mol.GetAtoms() if atom.GetSymbol() == 'C')
            molecular_weight = Chem.rdMolDescriptors.CalcExactMolWt(mol)
            results.append({
                'smiles': smiles,
                'carbon_atoms': carbon_count,
                'molecular_weight': molecular_weight
            })
    
    return results

# Example usage - analyzing carbon compounds
compounds = ['CCO', 'C6H6', 'CC(=O)O']  # Ethanol, Benzene, Acetic acid
print(analyze_carbon_compounds(compounds))
` +
  "```";

const BLOCKQUOTE = `
> Carbon is the **fourth most abundant** element in the *observable universe* by mass after hydrogen, helium, and oxygen. \`C₆H₁₂O₆\` represents glucose, a fundamental carbon-based molecule for life. Carbon's unique tetravalent bonding capability enables complex molecular architectures.
>
> The [carbon cycle](https://ibm.com) describes how carbon moves between Earth's atmosphere, oceans, and [living organisms](https://ibm.com){{target="_self"}} through photosynthesis and respiration. Carbon dating uses the radioactive isotope ¹⁴C to determine the age of organic materials. Diamond and graphite demonstrate carbon's structural versatility through different bonding arrangements.
 `;

const MARKDOWN = `
${TEXT}
---
${HEADERS}
---
${TABLE}
---
${BLOCKQUOTE}
---
${ORDERED_LIST}
---
${UNORDERED_LIST}
---
`;

const HTML = `
Here is some <b>Carbon</b> information peppered with HTML!

<style>
    .fun-fact { 
        background-color: #e8f5e8; 
        color: #161616;
        border-inline-start: 4px solid #27ae60; 
        padding: 10px; 
        margin: 10px 0; 
    }
</style>
<h2>Carbon <b>(C)</b> - The Element of Life</h2>

<p><strong>Carbon</strong> is a <mark>non-metallic element</mark> with atomic number <strong>6</strong>. It's one of the most important elements on Earth because it forms the backbone of all organic molecules.</p>

<div class="fun-fact">
    <h4>Fun Fact</h4>
    <p>Carbon can form more compounds than any other element except hydrogen. There are over <em>10 million</em> known carbon compounds!</p>
</div>

<blockquote>
    <p>"We are made of <strong>star stuff</strong>. We are a way for the cosmos to know itself."</p>
    <cite>— Carl Sagan (referring to carbon-based life)</cite>
</blockquote>

<h3>Why Carbon Matters</h3>
<ol>
    <li>Forms the basis of all <abbr title="deoxyribonucleic acid">DNA</abbr> and proteins</li>
    <li>Essential for photosynthesis in plants</li>
    <li>Key component in fossil fuels and climate change</li>
    <li>Used in advanced materials like carbon nanotubes</li>
</ol>

<hr>
<small><em>Carbon's unique ability to form four bonds makes it the perfect element for complex biological molecules.</em></small>`;

const WORD_DELAY = 40;

export {
  CHAIN_OF_THOUGHT_TEXT_STREAM,
  CHAIN_OF_THOUGHT_TEXT,
  WELCOME_TEXT,
  TEXT,
  WORD_DELAY,
  TABLE,
  ORDERED_LIST,
  UNORDERED_LIST,
  CODE,
  BLOCKQUOTE,
  MARKDOWN,
  HTML,
};
