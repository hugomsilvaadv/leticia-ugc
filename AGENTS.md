# AGENTS.md

## Project
Letícia Leite — fashion editorial blog + UGC portfolio.

## Product principle
The website must feel like an independent fashion publication first and a UGC creator portfolio second.

Target balance on the homepage:
- approximately 75% editorial/blog experience
- approximately 25% commercial/UGC presence

UGC should be visible and easy to reach, but never dominate the editorial identity.

## Language
- Public-facing content: Brazilian Portuguese.
- Code and technical identifiers: English when appropriate.
- Explanations to the owner: Brazilian Portuguese.

## Visual direction
Use the design tokens and rules in `docs/DESIGN-SYSTEM.md`.

Avoid:
- generic AI landing-page aesthetics
- excessive gradients
- glassmorphism
- neon colors
- excessive shadows
- excessive rounded cards
- overuse of handwritten/script typography
- fake testimonials, fake metrics or fake clients

Prefer:
- editorial whitespace
- strong photography
- asymmetrical but controlled grids
- magazine-like typography
- thin rules and borders
- elegant hover states
- subtle motion
- high readability

## Technology
Unless the repository later establishes otherwise:
- Next.js
- TypeScript
- Tailwind CSS
- App Router
- npm

## Architecture
Keep content/data separate from presentation whenever practical.

Design reusable structures for:
- ArticleCard
- FeaturedStory
- CategoryRail
- EditorialGrid
- AuthorBlock
- NewsletterBlock
- UGCServiceCard
- PortfolioCard
- CaseStudy
- RelatedArticles
- Search
- Tag/category archive

## Editorial requirements
Articles should support:
- title
- subtitle/dek
- slug
- category
- tags
- publication date
- update date
- hero image
- image caption/credit
- reading time
- SEO title/description
- Open Graph image
- body content
- related articles
- optional product/shopping cards
- optional sponsored-content disclosure

## SEO baseline
Implement:
- semantic HTML
- metadata
- canonical URLs
- Open Graph
- Twitter cards
- sitemap
- robots.txt
- structured data for Article where appropriate
- optimized images
- internal linking
- category and tag pages
- readable URLs

## Accessibility
- Keyboard navigation
- Visible focus states
- Semantic headings
- Alt text support
- Adequate contrast
- Reduced-motion support

## Performance
Prioritize Core Web Vitals. Avoid loading large media unnecessarily. Use responsive images and lazy loading below the fold.

## Business information from supplied portfolio
Creator: Letícia Leite
Instagram: @leticiafndg
Email: leticialeitecontent@gmail.com
Locations: Ribeirão Preto (SP) / Sete Lagoas (MG)

Do not publish the phone number until the owner explicitly confirms that it should be public on the website.

Background:
- Fashion Design education
- strong interest in fashion, beauty, makeup and lifestyle
- natural on-camera communication
- commercial and styling perspective
- creator services include UGC, product reviews, try-ons, edited videos and photography

## Workflow
Before changes:
1. Read this file.
2. Read relevant docs.
3. Inspect the repository.
4. Preserve working features.

After changes:
1. Run lint/build/tests when available.
2. Fix errors caused by the change.
3. Update documentation if architecture or business rules changed.
4. Summarize changed files and validation.
