import { vars } from "nativewind";

export const themes = {
  light: vars({
    "--color-primary": "#3D2A32",
    "--color-invert": "#FFF8FA",
    "--color-secondary": "#FFFFFF",
    "--color-background": "#FDF0F4",
    "--color-darker": "#F8E4EA",
    "--color-text": "#3D2A32",
    "--color-subtext": "#9B7A85",
    "--color-highlight": "#D4849A",
    "--color-border": "rgba(212, 132, 154, 0.25)",
    "--color-gradient": "rgba(212, 132, 154, 0.15)",
  }),
  dark: vars({
    "--color-primary": "#FDF0F4",
    "--color-invert": "#1F1518",
    "--color-secondary": "#2A1F24",
    "--color-background": "#1A1215",
    "--color-darker": "#120C0E",
    "--color-text": "#FDF0F4",
    "--color-subtext": "#B89AA3",
    "--color-highlight": "#E8A0B5",
    "--color-border": "rgba(232, 160, 181, 0.2)",
    "--color-gradient": "rgba(26, 18, 21, 0.7)",
  }),
};
