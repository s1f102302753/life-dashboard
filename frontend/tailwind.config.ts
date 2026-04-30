import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#f4f7f2",
        ink: "#13231a",
        moss: "#3f6b57",
        leaf: "#d9e7dd",
        peach: "#f5d6c6",
        gold: "#d5b46f"
      },
      boxShadow: {
        soft: "0 18px 48px -24px rgba(19, 35, 26, 0.28)"
      },
      fontFamily: {
        sans: ["var(--font-family)", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
