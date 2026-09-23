/** @type {import("prettier").Config} */
const config = {
  // Formatting
  endOfLine: "lf",
  printWidth: 80,
  semi: true,
  singleQuote: false,
  tabWidth: 2,
  trailingComma: "all",
  useTabs: false,

  // Tailwind integration
  plugins: ["prettier-plugin-tailwindcss"],
  tailwindFunctions: ["cn"],
  tailwindStylesheet: "./src/app/globals.css",
};

export default config;
