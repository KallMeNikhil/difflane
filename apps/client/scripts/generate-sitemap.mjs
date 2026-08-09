import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const SITE_URL = (process.env.VITE_SITE_URL || "https://difflane.whynikhil.xyz").replace(/\/$/, "");

const PUBLIC_ROUTES = ["/"];

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, "../public/sitemap.xml");

const today = new Date().toISOString().slice(0, 10);

const urlEntries = PUBLIC_ROUTES.map(
  (path) => `  <url>
    <loc>${SITE_URL}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>`
).join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;

writeFileSync(outputPath, sitemap, "utf-8");
console.log(`Generated sitemap.xml with ${PUBLIC_ROUTES.length} route(s) at ${outputPath}`);
