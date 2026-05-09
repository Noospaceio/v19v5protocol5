/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        accent: "#12c2e9",     // hellblau
        "accent-2": "#c471ed", // neonlila
        "accent-3": "#4a00e0", // tiefes lila
        muted: "#b0a7c7",      // dezentes grau/lila
        panel: "#141428",      // dunkles panel
      },
      backgroundImage: {
        "psy-gradient": "linear-gradient(135deg, #001f3f, #3b00b9, #7d00ff, #32004b)",
        "psy-btn": "linear-gradient(90deg, #4a00e0, #8e2de2, #c471ed, #12c2e9)",
      },
      animation: {
        "gradient-flow": "gradient-flow 20s ease infinite",
      },
      keyframes: {
        "gradient-flow": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      },
    },
  },
  plugins: [],
};
