import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [
      {
        source: "/e-board",
        destination: "/contact",
        permanent: true,
      },
      {
        source: "/who-we-are",
        destination: "/about",
        permanent: true,
      },
      {
        source: "/f-o-o-l-s-acronyms",
        destination: "/about",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
