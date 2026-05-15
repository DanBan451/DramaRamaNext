import { nextui } from "@nextui-org/theme";

module.exports = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
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
        // Light matte professional palette
        // Element colors (original brighter versions)
        earth: '#4A7C59',
        fire: '#E85D04',
        air: '#7B9EA8',
        water: '#3D5A80',
        change: '#9B5DE5',
        // Primary action color - deep bloody red
        primary: '#8B0000',
        // UI colors
        void: '#1A1A1A',
        clarity: '#FFFFFF',
        ash: '#333333',
        smoke: '#666666',
        mist: '#F5F5F5',
        // Accent colors
        accent: {
          red: '#E85D04',
          blue: '#3D5A80',
        },
        // Steel: cool navy-grey reserved for the cinematic "philosophy" figure
        // and the water element tint. Stays inside the palette (no blue-creep).
        steel: '#4A5B6E',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'pulse-subtle': 'pulse-subtle 3s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
        'shimmer': 'shimmer 1s ease-out forwards',
        'shimmer-slide': 'shimmerSlide 1.5s ease-in-out infinite',
        'cube-twist': 'cubeTwist 2.2s ease-in-out infinite',
      },
      keyframes: {
        cubeTwist: {
          '0%': { transform: 'rotateX(-18deg) rotateY(0deg)' },
          '35%': { transform: 'rotateX(-18deg) rotateY(200deg)' },
          '65%': { transform: 'rotateX(162deg) rotateY(200deg)' },
          '100%': { transform: 'rotateX(-18deg) rotateY(360deg)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { boxShadow: '0 0 0 0 rgba(155, 93, 229, 0)' },
          '30%': { boxShadow: '0 0 20px 5px rgba(155, 93, 229, 0.3)' },
          '100%': { boxShadow: '0 0 0 0 rgba(155, 93, 229, 0)' },
        },
        shimmerSlide: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      borderRadius: {
        'subtle': '2px',
      },
    },
  },
  darkMode: "class",
  plugins: [nextui()],
};
