import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const config: NextConfig = {
  // The Docker image copies only .next/standalone: a server.js with the files it needs.
  output: "standalone",
  // The workspace root, so the standalone output also carries packages/*.
  outputFileTracingRoot: path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."),
  transpilePackages: ["@ft3/shared"],
  // The images are built on the build machine's architecture and copied into the arm64 one: the
  // image optimizer would load a native sharp built for the wrong one, and nothing uses it. Leaving
  // sharp and libvips out of the standalone output takes it from 61 to 23 MB.
  images: { unoptimized: true },
  outputFileTracingExcludes: {
    "*": ["../../node_modules/.pnpm/sharp@*/**", "../../node_modules/.pnpm/@img+*/**"],
  },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default config;
