import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { flatRoutes } from "remix-flat-routes";
// import { vercelPreset } from '@vercel/remix/vite';

export default defineConfig({
  server: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      // external: ['db/*.ts'],
    },
    target: 'esnext' //browsers can handle the latest ES features
  },
  plugins: [
    remix({
      presets: [
        // vercelPreset() un comment if using vercel
      ],
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
      
      routes: async (defineRoutes) => {
        return flatRoutes("routes", defineRoutes);
      },
    }),
    tsconfigPaths(),
  ],
  optimizeDeps: {
    include: [
      "@remix-run/node",
      "date-fns",
      "@phosphor-icons/react",
      "drizzle-orm",
      "remix-auth",
      "remix-auth-socials",
      "@radix-ui/react-avatar",
      "@radix-ui/react-tooltip",
      "clsx",
      "tailwind-merge",
      "drizzle-orm/node-postgres",
      "pg",
      "drizzle-orm/pg-core",
      "react-markdown",
      "@langchain/core/prompts",
      "openai",
      "@langchain/openai",
      "langchain/chains/combine_documents",
    ],
  },
});
