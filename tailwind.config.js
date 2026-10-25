/**
 * Tailwind CSS 3.4. Run `npm run css:build` after changing a template or a class.
 * Colours come from design/tokens.json (one source of truth).
 */
const tokens = require("./design/tokens.json");

module.exports = {
  content: [
    "./views/**/*.html",
    "!./views/admin/**",
    "./src/common/view.ts",
    "./src/leads/enquiry-form.ts",
    "./public/static/js/app.js",
  ],
  theme: {
    extend: {
      colors: {
        cream: tokens.cream,
        sand: tokens.sand,
        blush: tokens.blush,
        maroon: tokens.maroon,
        gold: tokens.gold,
        ink: tokens.ink,
        wa: tokens.wa,
      },
      fontFamily: {
        serif: ['"Playfair Display"', "Hind", "Georgia", "serif"],
        sans: ["Hind", "system-ui", "-apple-system", '"Segoe UI"', "Roboto", "sans-serif"],
      },
      fontSize: {
        // Fluid type: scales smoothly from a 360px phone to a desktop.
        display: ["clamp(2.25rem, 1.5rem + 3.6vw, 4.25rem)", { lineHeight: "1.08", letterSpacing: "-0.01em" }],
        h1: ["clamp(2rem, 1.4rem + 2.6vw, 3.5rem)", { lineHeight: "1.12", letterSpacing: "-0.01em" }],
        h2: ["clamp(1.75rem, 1.35rem + 1.7vw, 2.75rem)", { lineHeight: "1.18" }],
        h3: ["clamp(1.25rem, 1.1rem + 0.6vw, 1.625rem)", { lineHeight: "1.3" }],
        lead: ["clamp(1.0625rem, 1rem + 0.4vw, 1.25rem)", { lineHeight: "1.65" }],
      },
      boxShadow: {
        card: "0 1px 2px rgb(43 29 26 / 0.05), 0 8px 24px -8px rgb(110 24 45 / 0.14)",
        lift: "0 2px 4px rgb(43 29 26 / 0.06), 0 16px 36px -10px rgb(110 24 45 / 0.22)",
        bar: "0 -4px 16px rgb(43 29 26 / 0.12)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
      },
      typography: () => ({
        saanidhya: {
          css: {
            "--tw-prose-body": tokens.ink.soft,
            "--tw-prose-headings": tokens.maroon["800"],
            "--tw-prose-lead": tokens.ink.soft,
            "--tw-prose-links": tokens.maroon["700"],
            "--tw-prose-bold": tokens.ink.DEFAULT,
            "--tw-prose-bullets": tokens.gold["500"],
            "--tw-prose-counters": tokens.gold["600"],
            "--tw-prose-quotes": tokens.maroon["800"],
            "--tw-prose-quote-borders": tokens.gold["400"],
            "--tw-prose-hr": tokens.maroon["100"],
            "--tw-prose-th-borders": tokens.maroon["200"],
            "--tw-prose-td-borders": tokens.maroon["100"],
            "h2, h3, h4": { fontFamily: '"Playfair Display", Hind, Georgia, serif' },
            a: { textDecorationColor: tokens.gold["400"], textUnderlineOffset: "3px" },
            img: { borderRadius: "1rem" },
            figure: { margin: "1.75em 0" },
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
