/**
 * Pagina "Il Capriccio Special Selections" della carta Word: testi descrittivi fissi,
 * riportati così come sono sul documento del ristorante.
 * Ogni riga della descrizione è un paragrafo; la parte prima dei ":" va in grassetto.
 */
export type SpecialSelection = {
  title: string;
  lines: string[];
  glass: string;
  bottle: string;
};

export const SPECIAL_SELECTIONS_HEADING = "Il Capriccio Special Selections";
export const SPECIAL_SELECTIONS_SUBHEADING = "Made exclusively for Antonio Grande";

export const SPECIAL_SELECTIONS: SpecialSelection[] = [
  {
    title: "San Carlo, Case Paolin, Montello e Colli Asolani, (DOC), 2021",
    lines: [
      "This wine is a blend of Cabernet Sauvignon and Merlot",
      "Aged 12-14 months in barriques, with a further aging of 6 months in wooden casks,",
      "then at the final age of 6 months in bottle.",
      "The color is Ruby Red.",
      "Analysis: It is perceived as having preserved red fruits, like raspberries and blackberries.",
      "well balanced with spices and vanilla flavors coming from the aging in barriques.",
      "Taste: Full, tasty, persistent with a pleasant aftertaste."
    ],
    glass: "30",
    bottle: "120"
  },
  {
    title: "Campo Dei Morer Cabernet, Case Paolin, (IGT), 2023",
    lines: [
      "This wine is a Cabernet Sauvignon",
      "After pressing the grapes, the fruits are allowed to mature for 10-12 days in contact with its skins and stems to enhance the wine’s flavor and structure. It is then aged in wooden barrels for 12 months.",
      "The color is Ruby Red.",
      "Analysis: It is perceived as having preserved red fruits, like raspberries and cherries.",
      "well balanced with cinnamon and vanilla flavors.",
      "Taste: Aromatic, with beautiful structure and yet, dry."
    ],
    glass: "18",
    bottle: "70"
  },
  {
    title: "Coste degli Angeli, Case Paolin, Manzoni Bianco, (IGT), 2023",
    lines: [
      "This wine is a hybrid blend of Pinot Blanc and Rhine Riesling.",
      "After lightly pressing, the wine is left in contact with the grape’s skins for 12-15 hours.",
      "Fermentation occurs in steel vats at controlled temperatures where select yeasts are added.",
      "Color: Pale Straw Yellow with Greenish Shades.",
      "Analysis: It is perceived as having preserved red fruits, like raspberries and",
      "cherries; well balanced with cinnamon and vanilla flavors.",
      "Aroma: elegant with its aromatic characteristic, where the scent of fruits and minerals is well recognizable.",
      "Flavor: Tasty, elegant and pleasantly aromatic"
    ],
    glass: "18",
    bottle: "75"
  }
];
