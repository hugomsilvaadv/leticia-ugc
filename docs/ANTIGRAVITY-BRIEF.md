# Antigravity Build Brief

Read:
1. AGENTS.md
2. docs/PROJECT-BRIEF.md
3. docs/DESIGN-SYSTEM.md
4. docs/CONTENT-ARCHITECTURE.md

Then build the first working version of the site.

## Goal
Create a production-quality Brazilian Portuguese fashion editorial site for Letícia Leite.

The site must feel like an independent fashion publication, not a generic creator landing page.

## Stack
- Next.js
- TypeScript
- Tailwind CSS
- App Router
- npm

## First implementation
Build:
- homepage
- Moda category
- Beleza category
- Lifestyle category
- UGC page
- Sobre page
- reusable article page template
- search UI
- responsive header/footer

Use mock editorial articles clearly marked as demo content where real posts do not exist yet.

Do not invent:
- clients
- testimonials
- metrics
- awards
- partnerships

## Homepage priority
Editorial first:
- one strong lead story
- secondary stories
- category sections
- latest articles
- curated/shopping area
- UGC module lower on the page
- newsletter
- social links

## Visual language
Follow docs/DESIGN-SYSTEM.md exactly.

Avoid a uniform grid of rounded cards.

Create a magazine-like hierarchy with photography, whitespace, rules and mixed content formats.

## Content model
Keep editorial demo data separate from UI components so it can later be replaced by CMS content.

## Validation
After implementation:
- npm install
- lint
- production build
- fix all errors
- verify desktop and mobile
- verify keyboard navigation
- report remaining limitations
