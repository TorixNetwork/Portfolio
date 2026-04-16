import type { APIRoute } from "astro";
import { siteConfig } from "@config/site";

export const GET: APIRoute = ({ site }) => {
  const siteUrl = site || new URL(siteConfig.url);
  const sitemapUrl = new URL("/sitemap-index.xml", siteUrl);

  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl.toString()}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
};
