# Torix Network Portfolio

A production-ready, static-first portfolio and business website for **Torix Network**. The site presents Torix as a premium digital infrastructure studio for Telegram bots, websites, web apps, API integrations, automation, VPS and cloud management, launch support, community growth strategy, and custom digital solutions.

The project is built for fast deployment on Vercel, Cloudflare Pages, and any static host that can serve the generated `dist/` output.

## Features

- Premium dark futuristic Torix visual identity
- Static Astro architecture with componentized sections
- Optimized Three.js hero scene loaded only when WebGL and motion preferences allow it
- Graceful non-WebGL and reduced-motion fallbacks
- Responsive layout tuned for phones, tablets, laptops, desktop, and ultrawide screens
- Accessible navigation, visible focus states, semantic sections, and keyboard-friendly mobile menu
- Static-friendly contact form with mailto fallback and optional form endpoint support
- SEO metadata, Open Graph/Twitter tags, sitemap generation, robots.txt, manifest, favicon, and deploy headers
- Responsive Playwright QA script for layout overflow, mobile navigation, console errors, and reduced-motion checks

## Tech Stack

- [Astro](https://astro.build/) for static site generation
- TypeScript for browser behavior
- Three.js for the progressive hero animation
- CSS custom properties and modern responsive layout primitives
- Playwright for optional responsive QA

## Local Setup

```bash
npm install
npm run dev
```

The dev server runs at `http://localhost:4321` by default.

## Commands

```bash
npm run dev          # Start local development
npm run build        # Build static production output into dist/
npm run preview      # Preview the production build locally
npm run qa:responsive # Run responsive/browser QA against a running local server
```

For QA against a custom URL:

```bash
QA_BASE_URL=http://127.0.0.1:4321 npm run qa:responsive
```

## Deployment

### Vercel

1. Import the GitHub repository in Vercel.
2. Use the Astro framework preset.
3. Set the build command to `npm run build`.
4. Set the output directory to `dist`.
5. Add `SITE_URL` with the final production URL for canonical URLs and sitemap output.
6. Add `PUBLIC_FORM_ENDPOINT` only if a real form backend is connected.

`vercel.json` includes static output settings and basic security/cache headers.

### Cloudflare Pages

1. Create a new Cloudflare Pages project from the GitHub repository.
2. Set the framework preset to Astro.
3. Set the build command to `npm run build`.
4. Set the build output directory to `dist`.
5. Set `NODE_VERSION` to `22` if your Cloudflare account does not infer it from `.node-version`.
6. Add `SITE_URL` with the final production URL.
7. Add `PUBLIC_FORM_ENDPOINT` only when using a hosted form endpoint.

Cloudflare Pages will copy `public/_headers` into the static output for deploy-time headers.

## Customization

- Branding, metadata, contact links, and form endpoint defaults: `src/config/site.ts`
- Navigation items: `src/config/site.ts`
- Service cards, advantages, ecosystem nodes, process steps, and form service options: `src/data/content.ts`
- Page composition: `src/pages/index.astro`
- Section markup: `src/sections/`
- Shared components: `src/components/`
- Global design system and responsive styling: `src/styles/global.css`
- Browser behavior and animation modules: `src/scripts/`
- Static assets, favicon, manifest, robots, and headers: `public/`

To connect a real form backend, set `PUBLIC_FORM_ENDPOINT` to a POST endpoint that accepts standard form fields: `name`, `email`, `service`, and `message`. Without that variable, the form opens the visitor's email client with a prefilled message to `torixnetwork@gmail.com`.

## Performance And Accessibility Notes

- The Three.js hero is dynamically imported, capped by viewport size, and paused when the tab is hidden or the hero leaves the viewport.
- Touch devices do not use custom cursor or card tilt effects.
- Reduced-motion users receive the static hero fallback and visible content without reveal transitions.
- The mobile menu uses proper `aria-expanded`, Escape-to-close, focus restoration, and simple focus wrapping.
- Images include intrinsic dimensions to reduce layout shift.
- The build output is fully static and does not require a server runtime.

## Folder Structure

```text
.
├── public/              # Static assets, headers, manifest, robots, favicon
├── scripts/             # Local QA tooling
├── src/
│   ├── components/      # Shared UI components
│   ├── config/          # Brand, metadata, links, navigation
│   ├── data/            # Editable site content
│   ├── layouts/         # Base HTML layout and SEO metadata
│   ├── pages/           # Astro pages
│   ├── scripts/         # Client-side TypeScript
│   ├── sections/        # Landing page sections
│   └── styles/          # Global CSS
├── astro.config.mjs
├── package.json
├── vercel.json
└── README.md
```

## Assets

The visible server-room image is self-hosted in `public/images/` and sourced from Pixabay under the Pixabay Content License. See `docs/ASSETS.md` for attribution details.

## License

This project is released under the MIT License. See `LICENSE`.
