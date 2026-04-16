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
    const canvas = document.querySelector(".hero-canvas");
    const next = document.querySelector("#about");
    const heroBottom = hero?.getBoundingClientRect().bottom ?? 0;
    const nextTop = next?.getBoundingClientRect().top ?? 0;
    const links = Array.from(document.querySelectorAll("a")).filter((link) => !link.getAttribute("href"));
    const canvasRect = canvas?.getBoundingClientRect();

    return {
      overflowX,
      hasHeroHint: nextTop <= window.innerHeight || heroBottom < window.innerHeight,
      emptyLinks: links.length,
      title: document.title,
      heroIsWebglActive: hero?.classList.contains("is-webgl-active") ?? false,
      heroIsFallback: hero?.classList.contains("is-webgl-fallback") ?? false,
      canvasWidth: canvas instanceof HTMLCanvasElement ? canvas.width : 0,
      canvasHeight: canvas instanceof HTMLCanvasElement ? canvas.height : 0,
      canvasCssWidth: canvasRect?.width ?? 0,
      canvasCssHeight: canvasRect?.height ?? 0,
      canvasOpacity: canvas ? getComputedStyle(canvas).opacity : "0"
    };
  });

  if (audit.overflowX > 2) failures.push(`${viewport.name}: horizontal overflow ${audit.overflowX}px`);
  if (!audit.hasHeroHint) failures.push(`${viewport.name}: next section hint is not visible under the hero`);
  if (audit.emptyLinks > 0) failures.push(`${viewport.name}: found empty anchor hrefs`);
  if (!audit.title.includes("Torix Network")) failures.push(`${viewport.name}: document title missing brand`);
  if (!audit.heroIsWebglActive) failures.push(`${viewport.name}: hero WebGL scene did not activate`);
  if (audit.heroIsFallback) failures.push(`${viewport.name}: hero unexpectedly used fallback on normal viewport`);
  if (audit.canvasOpacity !== "1") failures.push(`${viewport.name}: hero canvas is not visible`);
  if (audit.canvasWidth <= 300 || audit.canvasHeight <= 150) failures.push(`${viewport.name}: hero canvas retained default bitmap size`);
  if (audit.canvasCssWidth < viewport.width - 4 || audit.canvasCssHeight < viewport.height * 0.7) failures.push(`${viewport.name}: hero canvas is not sized to the hero`);
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
  const hero = document.querySelector(".hero");
  return {
    canvasDisplay: canvas ? getComputedStyle(canvas).display : "missing",
    heroIsWebglActive: hero?.classList.contains("is-webgl-active") ?? false,
    heroIsFallback: hero?.classList.contains("is-webgl-fallback") ?? false,
    hiddenRevealCount: Array.from(document.querySelectorAll(".reveal")).filter((element) => {
      const style = getComputedStyle(element);
      return Number(style.opacity) < 1;
    }).length
  };
});
if (reducedAudit.canvasDisplay !== "none") failures.push("reduced-motion: hero canvas should be disabled");
if (reducedAudit.heroIsWebglActive) failures.push("reduced-motion: hero WebGL scene should not activate");
if (!reducedAudit.heroIsFallback) failures.push("reduced-motion: hero should mark fallback mode");
if (reducedAudit.hiddenRevealCount > 0) failures.push("reduced-motion: reveal content should be visible");
await reducedContext.close();

const noWebglContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  colorScheme: "dark"
});
await noWebglContext.addInitScript(() => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function patchedGetContext(type, ...args) {
    if (type === "webgl" || type === "experimental-webgl" || type === "webgl2") return null;
    return originalGetContext.call(this, type, ...args);
  };
});
const noWebglPage = await noWebglContext.newPage();
await noWebglPage.goto(baseUrl, { waitUntil: "networkidle" });
await noWebglPage.waitForTimeout(600);
const noWebglAudit = await noWebglPage.evaluate(() => {
  const hero = document.querySelector(".hero");
  const canvas = document.querySelector(".hero-canvas");
  return {
    heroIsWebglActive: hero?.classList.contains("is-webgl-active") ?? false,
    heroIsFallback: hero?.classList.contains("is-webgl-fallback") ?? false,
    canvasOpacity: canvas ? getComputedStyle(canvas).opacity : "missing"
  };
});
if (noWebglAudit.heroIsWebglActive) failures.push("no-webgl: hero WebGL scene should not activate");
if (!noWebglAudit.heroIsFallback) failures.push("no-webgl: hero should use fallback");
if (noWebglAudit.canvasOpacity !== "0") failures.push("no-webgl: inactive canvas should stay hidden");
await noWebglContext.close();

await browser.close();

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Responsive QA passed for ${viewports.length} viewports at ${baseUrl}`);
