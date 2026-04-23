import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
               sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "ui-serif", "serif"]
      },
      colors: {
        brand: "#ff7a00",
        panel: "#f5f5f5",
        surface: "#fafafa",
        text: "#111111",
        wine: {
          bordeaux: "#722F37",
          bordeauxMuted: "#5c2830",
          graphite: "#252428",
          graphiteElevated: "#2f2e33",
          mist: "#e8e4df",
          cream: "#f7f5f2",
          paper: "#f1e8d2",
          paperSoft: "#f7f0dd",
          paperEdge: "#e6d9b6",
          gold: "#b8a369"
        }
      },
      boxShadow: {
        soft: "0 2px 14px rgba(17,17,17,0.06)"
      }
    }
  },
  plugins: []
};

export default config;
