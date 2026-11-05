import type { NextConfig } from "next";

// Cache Components desligado: quase todas as telas leem o cookie de login do
// Supabase e mostram dados que mudam a cada pedido, então renderizamos sob demanda.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default nextConfig;
