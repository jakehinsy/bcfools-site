import type { MetadataRoute } from "next";

const publicRoutes = ["", "/about", "/events", "/join", "/contact", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((route) => ({
    url: `https://brewcityfools.com${route}`,
    changeFrequency: route === "/events" ? "daily" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
