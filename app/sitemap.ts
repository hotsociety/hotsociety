import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://hotsociety.com.br";
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/termos`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacidade`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
