import type { Config } from "tailwindcss";

export default {
  content: [
    "./client/index.html",
    "./client/src/**/*.{js,ts,jsx,tsx}",
    "./shared/**/*.{js,ts,jsx,tsx}", // keep if you actually use /shared in client
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
