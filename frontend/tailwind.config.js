/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f9ff",
          600: "#2253cc",
          700: "#163d99"
        }
      }
    }
  },
  plugins: []
};
