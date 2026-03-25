/**
 * Mantine тема — Remnawave-like тёмный стиль.
 */
import { createTheme, MantineColorsTuple } from "@mantine/core";

// Фиолетовый (primary) как в Remnawave
const violet: MantineColorsTuple = [
  "#f3eeff",
  "#e4d9ff",
  "#c7b1fc",
  "#a986f9",
  "#9162f7",
  "#804cf6",
  "#7840f6",
  "#6730dc",
  "#5b29c5",
  "#4e21ae",
];

export const theme = createTheme({
  primaryColor: "violet",
  colors: { violet },
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  fontFamilyMonospace: "JetBrains Mono, Fira Code, monospace",

  defaultRadius: "md",

  components: {
    Button: {
      defaultProps: {
        radius: "md",
      },
    },
    Card: {
      defaultProps: {
        radius: "lg",
        padding: "xl",
      },
    },
    Badge: {
      defaultProps: {
        radius: "sm",
      },
    },
  },
});

// Цвета для кастомного использования
export const colors = {
  bg: "#0A0A0F",
  surface: "#111118",
  surfaceElevated: "#16161f",
  border: "#1E1E2E",
  borderLight: "#2a2a3e",
  primary: "#7840f6",
  primaryHover: "#6730dc",
  text: "#E2E8F0",
  textMuted: "#64748B",
  textSubtle: "#94a3b8",
  success: "#10b981",
  error: "#ef4444",
  warning: "#f59e0b",
};
