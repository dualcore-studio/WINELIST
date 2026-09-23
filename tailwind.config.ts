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
        /* Stile chiaro ispirato alle app di gestione cantina: fondo neutro caldo, un solo accento bordeaux. */
        canvas: "#f6f5f3",
        line: "#e7e4e0",
        muted: "#77706a",
        field: "#f1efec",
        accent: {
          DEFAULT: "#8e2f45",
          hover: "#76263a",
          soft: "#f6e9ec",
          ring: "rgba(142,47,69,0.25)"
        },
        brand: "#8e2f45",
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
      keyframes: {
        "drawer-in": { from: { transform: "translateX(24px)", opacity: "0" }, to: { transform: "none", opacity: "1" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } }
      },
      animation: {
        "drawer-in": "drawer-in 180ms ease-out",
        "fade-in": "fade-in 150ms ease-out"
      },
      boxShadow: {
        soft: "0 1px 2px rgba(17,17,17,0.04), 0 4px 16px rgba(17,17,17,0.04)",
        drawer: "-12px 0 40px rgba(17,17,17,0.12)"
      }
    }
  },
  plugins: []
};

export default config;
