# Refero-inspired editorial redesign — By Letícia

Source provided by site owner: Refero's ALIGNE `DESIGN.md`, `tokens.json`, `variables.css`, `theme.css` (extended export, October 2026). They provide visual measurements and recommendations, not reusable production site components, artwork, fonts or videos.

## Non-negotiable preservation

- No editorial text, published articles, UGC content, linktree, newsletter subscriptions, media or existing `/data` files are modified by this branch.
- All content and media continue to be read from existing SiteConfig, the article store, and the current admin API. Text styles and their adjustments remain owned by `/admin`.
- The `home.hero.media` property already supports image/video uploads and URL editing; **no persistent data migration or new table/schema is required**.
- The hero CTA still links to the same selected/published article, using `featuredSlug`. The compact cards, remaining article grids, newsletter form, links and portfólio functions are preserved.
- The visual CSS is isolated in `app/refero-editorial.css` and applied only to `main.homeEditorial`/its site header. The admin panel, article content, UGC detail page, and Linktree keep their previous interface pending approval.
- This is a first demonstrable homepage pass, **not a completed redesign of every route**, and no production deploy or direct change to Railway is part of the branch.

## Approved visual direction — Option B (luxury)

Visual selection approved by the site owner on 17 October 2026.
The white/ivory masthead strip is removed **on the homepage only**.
The existing brand wordmark is positioned in the upper-middle portion
of the full-width image/video, centered horizontally, in warm white serif
type with a subtle text shadow and a nearly imperceptible localized veil.
No opaque band, rectangular pill, new image or third-party font is introduced.

Technical detail: the same server-rendered `Header` continues to read
`config.brand.wordmark` and `config.brand.wordmarkStyle` from the existing
`/admin` editor. Only scoped CSS positions that existing element above the
homepage cover. Navigation remains accessible at the top left, utility copy
is preserved, and other pages retain the previous masthead.

The cover story's headline, eyebrow, summary and article CTA continue to
appear at the bottom-left of the photograph; no text or article destination
is changed. Motion-safe photo fallback remains available.

## New homepage visual hierarchy

- Hero image or 6–10 second owner-provided local MP4/WebM across the full width, with the *existing* title, eyebrow, dek and CTA overlaid.
- For existing configurations without video, the current cover photo remains. No stock clip or copied ALIGNE visual was added.
- A wide two-card article band follows the cover, then existing ticker, Moda, Looks, Beleza, UGC, archive and newsletter sections in their same content order.
- Colors draw on charcoal `#24170f`, dark ink `#151515`, white `#ffffff` and neutral dividers, adapted to the warm brand tones already stored.
- Flat image cards, quieter labels, larger negative space and clearer editorial grids. We do not use ALIGNE's blue product badge or store/cart widgets because By Letícia is an editorial/UGC portfolio, not a store.
- No commercial ALIGNE fonts or website photos are included. Existing editable fonts remain intact.

## Editing the video via /admin

1. Authenticate in `/admin`.
2. Open **Página inicial → Destaque da capa**.
3. Keep editing **Chamada pequena**, **Título principal**, **Resumo**, **Texto do link**, **Matéria vinculada**, and visual adjustment controls as previously.
4. In **Foto ou vídeo de abertura**, upload MP4/WebM up to 30 MB, or select a previously uploaded file. The component automatically recognizes video files and uses muted, looped, inline autoplay.
5. In **Miniatura do vídeo**, optionally provide the URL for an uploaded cover image, or leave blank to use the existing local hero photo. This acts as poster for loading, visitors with reduced motion and data-saver mode.
6. To disable video, replace the field with an image; no feature flag or code change is necessary.
7. Save and review the site's preview before publishing. No external YouTube autoplay/embed is supported as background; uploaded MP4/WebM is recommended.

For a good first impression, supply a short optimized 6–10s MP4, composed with sufficient free space for overlay text. A vertical alternative is a later enhancement; current CSS uses responsive object positioning controlled by the existing admin.

## QA and publishing gate

- CI tests, Next production build and typecheck must pass before merge.
- Check homepage at 320/390/1440 px, existing text and links, video and still fallback, reduced-motion preference, admin editing, newsletter, article navigation, search and Linktree.
- Confirm media remains within upload limit, alt/accessibility behavior, unchanged volume and existing persisted URLs.
- Only merge after the owner approves the visual result in a safe preview. A GitHub branch is not automatically a public preview URL; a preview deployment, isolated from production storage, may be configured separately.

## Design source limitations

The Refero style export defines a photographic hero but contains **no finished video component or licensed video asset**. The background-video experience is an original implementation inspired by the user's request, rather than code copied from the external site. Preserve the same text data and license boundaries.
