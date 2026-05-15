/* eslint-disable */
const { heroui } = require("@heroui/theme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"
  ],
  plugins: [
    heroui({
      themes: {
        dark: {
          extend: "dark",
          colors: {
            background: "#020617", // slate-950
            foreground: "#f8fafc", // slate-50
            content1: "#0f172a", // slate-900 (Cards)
            content2: "#1e293b", // slate-800 (Popovers)
            content3: "#334155", // slate-700 (Modals)
            content4: "#475569", // slate-600
            primary: {
              DEFAULT: "#38bdf8", // sky-400
              foreground: "#0f172a",
            },
            focus: "#38bdf8",
          }
        },
        "sky-light": {
          extend: "light",
          colors: {
            primary: { DEFAULT: "#0284c7", foreground: "#ffffff" },
            secondary: { DEFAULT: "#e0f2fe", foreground: "#0369a1" },
            danger: { DEFAULT: "#f43f5e", foreground: "#ffffff" }
          }
        },
        "sky-dark": {
          extend: "dark",
          colors: {
            background: "#020617", foreground: "#f8fafc", content1: "#0f172a", content2: "#1e293b", content3: "#334155", content4: "#475569",
            primary: { DEFAULT: "#0ea5e9", foreground: "#ffffff" },
            secondary: { DEFAULT: "#1e293b", foreground: "#f8fafc" },
            danger: { DEFAULT: "#f43f5e", foreground: "#ffffff" }
          }
        },
        "emerald-light": {
          extend: "light",
          colors: {
            primary: { DEFAULT: "#059669", foreground: "#ffffff" },
            secondary: { DEFAULT: "#d1fae5", foreground: "#047857" },
            danger: { DEFAULT: "#f43f5e", foreground: "#ffffff" }
          }
        },
        "emerald-dark": {
          extend: "dark",
          colors: {
            background: "#020617", foreground: "#f8fafc", content1: "#0f172a", content2: "#1e293b", content3: "#334155", content4: "#475569",
            primary: { DEFAULT: "#059669", foreground: "#ffffff" },
            secondary: { DEFAULT: "#1e293b", foreground: "#f8fafc" },
            danger: { DEFAULT: "#f43f5e", foreground: "#ffffff" }
          }
        },
        "violet-light": {
          extend: "light",
          colors: {
            primary: { DEFAULT: "#7c3aed", foreground: "#ffffff" },
            secondary: { DEFAULT: "#ede9fe", foreground: "#6d28d9" },
            danger: { DEFAULT: "#f43f5e", foreground: "#ffffff" }
          }
        },
        "violet-dark": {
          extend: "dark",
          colors: {
            background: "#020617", foreground: "#f8fafc", content1: "#0f172a", content2: "#1e293b", content3: "#334155", content4: "#475569",
            primary: { DEFAULT: "#7c3aed", foreground: "#ffffff" },
            secondary: { DEFAULT: "#1e293b", foreground: "#f8fafc" },
            danger: { DEFAULT: "#f43f5e", foreground: "#ffffff" }
          }
        }
      }
    })
  ],
};
