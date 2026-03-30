import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        marker: {
          green: "#22C55E",
          yellow: "#EAB308",
          red: "#EF4444",
          grey: "#94A3B8",
        },
      },
    },
  },
  plugins: [],
};

export default config;
