import { nextui } from "@nextui-org/theme";

module.exports = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        mb: '450px',
        tb: "640px",
        // => @media (min-width: 640px) { ... }

        lp: "1024px",
        // => @media (min-width: 1024px) { ... }

        dp: "1280px",
        // => @media (min-width: 1280px) { ... }
      },
    },
  },
  darkMode: "class",
  plugins: [nextui()],
};
