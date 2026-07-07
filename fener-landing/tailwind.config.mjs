export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        fener: {
          green: "#123C32",
          greenSoft: "#E7F0EB",
          gold: "#B88735",
          goldSoft: "#F3E6CF",
          cream: "#F8F3EA",
          ink: "#1D2521",
          slate: "#4B5752",
        },
      },
      boxShadow: {
        soft: "0 24px 60px rgba(18, 60, 50, 0.12)",
      },
    },
  },
};
