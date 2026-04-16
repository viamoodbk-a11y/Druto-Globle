/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#900A12", // deep red from web
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#FB923C", // orange-400 equivalent
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#F97316", // orange-500
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F3F4F6",
          foreground: "#6B7280",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#1F2937",
        },
      },
    },
  },
  plugins: [],
};
