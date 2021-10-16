import type { NextConfig } from "next";
import legacyRedirects from "./src/lib/legacy-redirects.json";
import staffRedirects from "./src/lib/staff-redirects.json";
import laboratoryRedirects from "./src/lib/laboratory-redirects.json";
const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async redirects() {
    return [...staffRedirects, ...laboratoryRedirects, ...legacyRedirects];
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.BACKEND_URL ?? "http://127.0.0.1:8080"}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};
export default config;
