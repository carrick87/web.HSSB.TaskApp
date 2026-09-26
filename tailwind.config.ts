import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#E9F2FF",
          100: "#CCE0FF",
          200: "#85B8FF",
          300: "#579DFF",
          400: "#388BFF",
          500: "#1D7AFC",
          600: "#0C66E4",
          700: "#0052CC",
          800: "#0747A6",
          900: "#003884",
        },
        neutral: {
          50: "#FAFBFC",
          100: "#F4F5F7",
          200: "#EBECF0",
          300: "#DFE1E6",
          400: "#C1C7D0",
          500: "#A5ADBA",
          600: "#6B778C",
          700: "#505F79",
          800: "#42526E",
          900: "#253858",
          1000: "#172B4D",
        },
        status: {
          pending: "rgb(234 179 8)",
          accepted: "rgb(59 130 246)",
          submitted: "rgb(168 85 247)",
          verified: "rgb(34 197 94)",
          rejected: "rgb(239 68 68)",
          failed: "rgb(107 114 128)",
        },
        atlassian: {
          blue: "#0052CC",
          "blue-light": "#E9F2FF",
          teal: "#00B8D9",
          green: "#36B37E",
          "green-light": "#E3FCEF",
          yellow: "#FFAB00",
          "yellow-light": "#FFFAE6",
          red: "#FF5630",
          "red-light": "#FFEBE6",
          purple: "#6554C0",
          "purple-light": "#EAE6FF",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Oxygen",
          "Ubuntu",
          "Fira Sans",
          "Droid Sans",
          "Helvetica Neue",
          "sans-serif",
        ],
      },
      boxShadow: {
        "atlassian-sm": "0 1px 1px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)",
        "atlassian": "0 1px 1px rgba(9,30,66,0.25), 0 0 1px 1px rgba(9,30,66,0.13)",
        "atlassian-md": "0 4px 8px -2px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)",
        "atlassian-lg": "0 8px 16px -4px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)",
        "atlassian-xl": "0 12px 24px -6px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)",
      },
      borderRadius: {
        "atlassian": "3px",
      },
    },
  },
  plugins: [],
};

export default config;
