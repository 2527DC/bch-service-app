/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Brand accent — active tabs, drawer highlight, primary buttons.
      // Never write raw bg-blue-*/text-blue-* for brand intent; use brand-*.
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        // Precision Logic design system (doc/stitch/). `secondary` in that system is
        // #2563eb — already brand-600, so the accent needed no change.
        //
        // surface — page ground. A hair bluer than gray-50 (#f9fafb); cards stay white
        //   on top of it, which is what gives the listing screens their layering.
        // ink — the selected / inverted fill: active filter chip, primary button.
        //   Replaces bg-gray-800 (#1f2937). Same value as Tailwind's slate-800, named
        //   here so a screen says what it means (AGENTS.md §4).
        surface: "#f8f9ff",
        ink: "#1e293b",
      },
    },
  },
  plugins: [],
};
