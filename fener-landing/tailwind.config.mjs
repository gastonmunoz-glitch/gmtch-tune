export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        fener: {
          red: "#9F1D21",
          redDark: "#731316",
          green: "#1F6B4A",
          gold: "#D69C32",
          cream: "#FFF7EA",
          ink: "#22201D",
        },
      },
      boxShadow: {
        soft: "0 24px 60px rgba(47, 32, 22, 0.13)",
      },
    },
  },
};
