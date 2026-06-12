/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        fintech: {
          primary: "#1E3A8A",      // Deep Slate Blue
          secondary: "#3B82F6",    // Lighter Blue
          accent: "#10B981",       // Emerald/Teal for positive actions
          background: "#F8FAFC",   // Slate 50
          surface: "#FFFFFF",
          text: "#0F172A",         // Slate 900
          textMuted: "#64748B",    // Slate 500
          border: "#E2E8F0",       // Slate 200
          success: "#22C55E",      // Green for settled
          warning: "#F59E0B",      // Amber for pending
          error: "#EF4444",        // Red for shortfall/error
        },
      },
    },
  },
  plugins: [],
}
