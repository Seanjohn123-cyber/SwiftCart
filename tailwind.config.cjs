/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pp: {
          navy: '#001c64',
          blue: '#003087',
          mid: '#0070ba',
          sky: '#009cde',
          gold: '#ffc439',
          mist: '#f5f7fa',
          line: '#d5dbe3',
          mute: '#545d68',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(0, 28, 100, 0.06), 0 8px 24px rgba(0, 28, 100, 0.06)',
        lift: '0 8px 28px rgba(0, 48, 135, 0.12)',
      },
    },
  },
  plugins: [],
};
