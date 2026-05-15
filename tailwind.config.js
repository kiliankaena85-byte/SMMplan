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
        sky: {
          extend: "light",
          colors: {
            primary: {
              DEFAULT: "#0284c7",
              foreground: "#ffffff",
            },
            secondary: {
              DEFAULT: "#e0f2fe",
              foreground: "#0369a1",
            },
            danger: {
              DEFAULT: "#f43f5e",
              foreground: "#ffffff",
            }
          }
        },
        emerald: {
          extend: "light",
          colors: {
            primary: {
              DEFAULT: "#059669",
              foreground: "#ffffff",
            },
            secondary: {
              DEFAULT: "#d1fae5",
              foreground: "#047857",
            },
            danger: {
              DEFAULT: "#f43f5e",
              foreground: "#ffffff",
            }
          }
        },
        violet: {
          extend: "light",
          colors: {
            primary: {
              DEFAULT: "#7c3aed",
              foreground: "#ffffff",
            },
            secondary: {
              DEFAULT: "#ede9fe",
              foreground: "#6d28d9",
            },
            danger: {
              DEFAULT: "#f43f5e",
              foreground: "#ffffff",
            }
          }
        }
      }
    })
  ],
};
