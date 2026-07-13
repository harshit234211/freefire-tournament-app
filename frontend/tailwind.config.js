/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#0a0a0b",
        cardBg: "#121214",
        neonRed: "#ff003c",
        goldGlow: "#d4af37",
        neonCyan: "#00f0ff",
        subText: "#94a3b8"
      },
      fontFamily: {
        orbitron: ["var(--font-orbitron)", "sans-serif"],
        rajdhani: ["var(--font-rajdhani)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
}
