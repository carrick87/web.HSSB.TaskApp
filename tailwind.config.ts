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
        status: {
          pending: "rgb(234 179 8)",
          accepted: "rgb(59 130 246)",
          submitted: "rgb(168 85 247)",
          verified: "rgb(34 197 94)",
          rejected: "rgb(239 68 68)",
          failed: "rgb(107 114 128)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
