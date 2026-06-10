import type { NextConfig } from "next";

// Pin Turbopack's workspace root to this app directory. Without this, Turbopack
// infers the monorepo / git root (C:\HUST\DATN\source-code) as the workspace root
// and then fails to resolve packages such as `tailwindcss` that live in
// facez-front/node_modules ("Can't resolve 'tailwindcss'").
//
// `process.cwd()` is the directory `next dev` is launched from. The `dev`/`build`
// npm scripts run inside facez-front, so this resolves to the app root.
const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
