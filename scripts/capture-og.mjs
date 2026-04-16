import { chromium } from "@playwright/test";

const baseUrl = process.env.QA_BASE_URL || "http://127.0.0.1:4321";
const outputPath = "public/og-image.png";

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
  colorScheme: "dark"
});

await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.addStyleTag({
  content:
    ".cursor-dot,.cursor-ring,.scroll-cue,.hero-actions{display:none!important}body{overflow:hidden!important}.hero{min-height:700px!important;max-height:none!important}"
});
await page.waitForTimeout(900);
await page.screenshot({ path: outputPath, fullPage: false });
await browser.close();

console.log(`Captured ${outputPath} from ${baseUrl}`);
