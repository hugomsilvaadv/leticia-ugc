# Design System — Letícia Leite

## Visual thesis
"Sofisticação editorial quente."

The site should combine the calm neutral palette of an independent fashion magazine with the warmer rose/terracotta identity already present in Letícia's portfolio.

It should feel:
- feminine without becoming childish
- fashion-forward without looking inaccessible
- personal without looking amateur
- commercial without looking like an agency landing page

## Color tokens
Derived from the supplied visual material.

```css
:root {
  --ivory: #FDF9F2;
  --blush: #EAD9CF;
  --sand: #DBC3AB;
  --taupe: #918271;
  --rose: #CB7C6D;
  --terracotta: #7C543D;
  --espresso: #3B2B22;
}
```

### Usage
- Main background: Ivory
- Alternate editorial sections: Blush / Sand at low visual weight
- Main text: Espresso
- Secondary text: Taupe
- Accent: Rose
- Strong CTA / hover accent: Terracotta

Avoid using all colors in one viewport.

## Typography
Preferred direction:
- Editorial serif for headlines: Cormorant Garamond or Bodoni Moda
- Clean sans-serif for body/UI: Manrope or Inter
- Signature/script: use only as a brand signature or tiny editorial accent, preferably using a real Letícia signature asset later

Typography hierarchy:
- oversized editorial H1
- elegant serif article titles
- restrained uppercase sans-serif eyebrow labels
- highly readable body copy

## Layout
Desktop:
- 12-column grid
- generous outer margins
- large photographic areas
- asymmetrical editorial compositions
- thin separators

Mobile:
- photography remains dominant
- editorial hierarchy preserved
- no tiny magazine-style text
- horizontal category rails may scroll

## Components
### Header
Desktop:
- slim utility line if needed
- centered or left editorial wordmark
- nav: Moda, Beleza, Lifestyle, Achados, UGC, Sobre
- search icon
- Instagram icon

Mobile:
- wordmark
- menu
- search

### Hero
Use a magazine-cover approach:
- one dominant image/story
- strong serif headline
- short dek
- category eyebrow
- no oversized SaaS-style buttons

### Article cards
Multiple editorial variants:
- lead
- landscape
- portrait
- compact text card
- numbered/trending card

Do not make every article card identical.

### UGC block
Visual break using Blush or Sand.
Include:
- short positioning statement
- 3–4 selected portfolio pieces
- understated CTA: "Trabalhe comigo"
- no aggressive sales language

### Newsletter
Editorial invitation rather than generic "subscribe".
Example tone:
"Uma seleção de moda, beleza e achados para chegar direto na sua caixa de entrada."

## Imagery
Prioritize:
- warm natural light
- editorial crops
- visible texture
- candid but styled portraits
- product close-ups
- detail shots
- full-look photography

The supplied portfolio already supports this direction well.

## Motion
- subtle image scale on hover
- 150–250ms transitions
- small underline/reveal interactions
- no continuous decorative animation

## Visual anti-patterns
Do not use:
- glass cards
- purple/blue gradients
- generic black-and-white luxury clone
- giant pill buttons everywhere
- excessive drop shadows
- dense dashboard-style grids
