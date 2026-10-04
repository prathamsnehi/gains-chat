import { useColorScheme } from "react-native";

export type Palette = ReturnType<typeof colorsFor>;

export function colorsFor(dark: boolean) {
  return dark
    ? {
        background: "#101311",
        surface: "#1B211D",
        elevated: "#252D27",
        text: "#F4F5EF",
        muted: "#A6B1A7",
        border: "#354039",
        accent: "#B3E366",
        accentText: "#142108",
        danger: "#FF9C91",
        userBubble: "#314334",
        assistantBubble: "#202922",
      }
    : {
        background: "#F5F6F1",
        surface: "#FFFFFF",
        elevated: "#E9EEE5",
        text: "#17211A",
        muted: "#69766B",
        border: "#DDE4DA",
        accent: "#375D34",
        accentText: "#FFFFFF",
        danger: "#B83A33",
        userBubble: "#E6EEE2",
        assistantBubble: "#FFFFFF",
      };
}

export function usePalette() {
  return colorsFor(useColorScheme() === "dark");
}
