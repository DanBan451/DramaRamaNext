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
        lp: "1024px",
        dp: "1280px",
      },
      colors: {
        earth: '#2d5016',
        fire: '#dc2626',
        air: '#0ea5e9',
        water: '#1e40af',
        change: '#7c3aed',
        void: '#000000',
        clarity: '#ffffff',
        ash: '#374151',
        smoke: '#6b7280',
        mist: '#e5e7eb',
      },
      fontFamily: {
        display: ['Instrument Serif', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'pulse-subtle': 'pulse-subtle 3s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
      },
    },
  },
  darkMode: "class",
  plugins: [nextui()],
};
