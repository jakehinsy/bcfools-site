import type { NextConfig } from "next";
import { siteConfig } from "./src/config/site";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [
      { source: "/join-brew-city", destination: "/join", permanent: true },
      { source: "/training", destination: "/#training", permanent: true },
      { source: "/store", destination: "/join", permanent: true },
      { source: "/cart", destination: "/contact", permanent: true },
      { source: "/checkout", destination: "/contact", permanent: true },
      { source: "/shop/new-membership", destination: "/join", permanent: true },
      {
        source: "/my-account",
        destination: siteConfig.links.memberDashboard,
        permanent: true,
      },
      {
        source: "/shop/membership-renewal",
        destination: siteConfig.links.renewal,
        permanent: true,
      },
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
