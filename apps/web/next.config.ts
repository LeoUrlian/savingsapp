import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Só na imagem Docker (BUILD_STANDALONE=true): gera uma pasta enxuta. O
  // "root" é a raiz do monorepo, para o Next copiar também o pacote
  // compartilhado. Na Vercel isso fica desligado.
  ...(process.env.BUILD_STANDALONE === "true"
    ? {
        output: "standalone" as const,
        outputFileTracingRoot: path.join(process.cwd(), "../.."),
      }
    : {}),
  partialPrefetching: true,
  // Hospedagem separada (Vercel + Render): o navegador chama /api no próprio
  // endereço do front, e o Next repassa para a API. Assim o cookie de sessão
  // continua sendo do mesmo site. Defina API_PROXY_URL (na hora do build).
  async rewrites() {
    const api = process.env.API_PROXY_URL;
    if (!api) return [];
    return [{ source: "/api/:path*", destination: `${api}/:path*` }];
  },
  // O navegador não pode guardar o service worker em cache, senão uma versão
  // nova demora a chegar.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
