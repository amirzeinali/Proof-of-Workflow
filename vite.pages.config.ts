import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "Proof-of-Workflow";
const pagesBase = process.env.PAGES_BASE ?? `/${repositoryName}/`;

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? pagesBase : "/",
  plugins: [react()],
  build: {
    outDir: "pages-dist",
    emptyOutDir: true,
  },
});
