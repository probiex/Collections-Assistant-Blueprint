/* GENERATED FROM tokens.json -- DO NOT EDIT. Run scripts/build-tokens.mjs. */
// Portable design tokens (colors as hex). Web consumes the theme via
// src/index.css; mobile (Expo) and any other platform import this object so the
// whole product shares one source of truth.
export const tokens = {
  "color": {
    "light": {
      "background": "#F7F3EC",
      "foreground": "#2C2A24",
      "border": "#E5DDCD",
      "card": "#ffffff",
      "cardForeground": "#2C2A24",
      "popover": "#ffffff",
      "popoverForeground": "#2C2A24",
      "primary": "#5C7460",
      "primaryForeground": "#F7F3EC",
      "secondary": "#EFE6D6",
      "secondaryForeground": "#4A4434",
      "muted": "#F1EBDF",
      "mutedForeground": "#8A8273",
      "accent": "#D9C58A",
      "accentForeground": "#3B3527",
      "destructive": "#C05B3E",
      "destructiveForeground": "#FFF9F3",
      "input": "#D6CDBE",
      "ring": "#5C7460",
      "chart1": "#5C7460",
      "chart2": "#C77B53",
      "chart3": "#8A9A5B",
      "chart4": "#6B7B8C",
      "chart5": "#9C7A97",
      "sidebar": "#2E372E",
      "sidebarForeground": "#F1EEE4",
      "sidebarBorder": "#414C40",
      "sidebarPrimary": "#D9C58A",
      "sidebarPrimaryForeground": "#2C2A24",
      "sidebarAccent": "#3C463B",
      "sidebarAccentForeground": "#F1EEE4",
      "sidebarRing": "#9DB48C"
    },
    "dark": {
      "background": "#1F211D",
      "foreground": "#F4EFE5",
      "border": "#414C40",
      "card": "#2E372E",
      "cardForeground": "#F4EFE5",
      "popover": "#343A32",
      "popoverForeground": "#F4EFE5",
      "primary": "#9DB48C",
      "primaryForeground": "#1F211D",
      "secondary": "#4A4434",
      "secondaryForeground": "#F1EEE4",
      "muted": "#343A32",
      "mutedForeground": "#A9B8A4",
      "accent": "#D9C58A",
      "accentForeground": "#2C2A24",
      "destructive": "#D97A5C",
      "destructiveForeground": "#211815",
      "input": "#596457",
      "ring": "#9DB48C",
      "chart1": "#9DB48C",
      "chart2": "#D4936F",
      "chart3": "#B0BE7D",
      "chart4": "#8FA1B1",
      "chart5": "#B893B2",
      "sidebar": "#171A16",
      "sidebarForeground": "#F1EEE4",
      "sidebarBorder": "#343A32",
      "sidebarPrimary": "#D9C58A",
      "sidebarPrimaryForeground": "#2C2A24",
      "sidebarAccent": "#343A32",
      "sidebarAccentForeground": "#F1EEE4",
      "sidebarRing": "#9DB48C"
    }
  },
  "fontFamily": {
    "sans": [
      "Karla",
      "sans-serif"
    ],
    "serif": [
      "Fraunces",
      "serif"
    ],
    "mono": [
      "Geist Mono",
      "monospace"
    ]
  },
  "radius": "1.5rem",
  "spacing": "0.25rem"
} as const;

export type Tokens = typeof tokens;
export default tokens;
