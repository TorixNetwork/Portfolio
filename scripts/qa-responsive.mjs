import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = process.env.QA_BASE_URL || "http://127.0.0.1:4321";
const outputDir = "test-results/responsive";

const viewports = [
  { name: "320", width: 320, height: 700, isMobile: true },
  { name: "360", width: 360, height: 740, isMobile: true },
  { name: "390", width: 390, height: 844, isMobile: true },
  { name: "412", width: 412, height: 915, isMobile: true },
  { name: "768", width: 768, height: 1024, isMobile: true },
  { name: "1024", width: 1024, height: 900, isMobile: false },
  { name: "1280", width: 1280, height: 900, isMobile: false },
  { name: "1440", width: 1440, height: 1000, isMobile: false },
  { name: "ultrawide", width: 1920, height: 980, isMobile: false }
];

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();
const failures = [];

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.isMobile ? 2 : 1,
    isMobile: viewport.isMobile,
    hasTouch: viewport.isMobile,
    colorScheme: "dark"
  });
  const page = await context.newPage();
  const consoleErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  const audit = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const overflowX = Math.max(body.scrollWidth, doc.scrollWidth) - doc.clientWidth;
    const hero = document.querySelector(".hero");
    const next = document.querySelector("#about");
    const heroBottom = hero?.getBoundingClientRect().bottom ?? 0;
    const nextTop = next?.getBoundingClientRect().top ?? 0;
    const links = Array.from(document.querySelectorAll("a")).filter((link) => !link.getAttribute("href"));

    return {
      overflowX,
      hasHeroHint: nextTop <= window.innerHeight || heroBottom < window.innerHeight,
      emptyLinks: links.length,
      title: document.title
    };
  });

  if (audit.overflowX > 2) failures.push(`${viewport.name}: horizontal overflow ${audit.overflowX}px`);
  if (!audit.hasHeroHint) failures.push(`${viewport.name}: next section hint is not visible under the hero`);
  if (audit.emptyLinks > 0) failures.push(`${viewport.name}: found empty anchor hrefs`);
  if (!audit.title.includes("Torix Network")) failures.push(`${viewport.name}: document title missing brand`);
  if (consoleErrors.length) failures.push(`${viewport.name}: console errors: ${consoleErrors.join(" | ")}`);

  if (viewport.name === "390") {
    await page.getByRole("button", { name: /open navigation menu/i }).click();
    await page.getByRole("navigation", { name: /mobile navigation/i }).waitFor();
    const expanded = await page.locator("[data-menu-toggle]").getAttribute("aria-expanded");
    if (expanded !== "true") failures.push("390: mobile menu did not expose expanded state");
    await page.keyboard.press("Escape");
  }

  await page.evaluate(async () => {
    const step = Math.max(420, Math.floor(window.innerHeight * 0.72));
    const max = document.documentElement.scrollHeight - window.innerHeight;

    for (let y = 0; y <= max; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => window.setTimeout(resolve, 80));
    }

    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${outputDir}/${viewport.name}.png`, fullPage: true });
  await context.close();
}

const reducedContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  reducedMotion: "reduce",
  colorScheme: "dark"
});
const reducedPage = await reducedContext.newPage();
await reducedPage.goto(baseUrl, { waitUntil: "networkidle" });
const reducedAudit = await reducedPage.evaluate(() => {
  const canvas = document.querySelector(".hero-canvas");
  return {
    canvasDisplay: canvas ? getComputedStyle(canvas).display : "missing",
    hiddenRevealCount: Array.from(document.querySelectorAll(".reveal")).filter((element) => {
      const style = getComputedStyle(element);
      return Number(style.opacity) < 1;
    }).length
  };
});
if (reducedAudit.canvasDisplay !== "none") failures.push("reduced-motion: hero canvas should be disabled");
if (reducedAudit.hiddenRevealCount > 0) failures.push("reduced-motion: reveal content should be visible");
await reducedContext.close();

await browser.close();

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Responsive QA passed for ${viewports.length} viewports at ${baseUrl}`);
