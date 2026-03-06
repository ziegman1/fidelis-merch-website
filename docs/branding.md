# Fidelis Merch — Design System & Branding

Derived from the provided logo and brand assets (shield, Celtic cross, FIDELIS wordmark, JUDE 1:3).

---

## Brand Attributes

- **Clean, premium, seminary/heritage-inspired**
- Formal, traditional, dignified
- Strong contrast (dark backgrounds, metallic gold, deep red)

---

## Color Palette

| Role | Name | Hex | Usage |
|------|------|-----|--------|
| **Background (primary)** | Black | `#000000` | Main dark background, footer, header |
| **Primary accent** | Fidelis Gold | `#B89649` | CTAs, headings, borders, logo outline |
| **Secondary accent** | Fidelis Red | `#8B2F31` | Cross fill, highlights, badges, links on light |
| **Neutral light** | Cream | `#F5F0E6` | Body backgrounds (light sections), cards |
| **Neutral mid** | Warm Gray | `#6B5B4F` | Secondary text, borders on light |
| **Muted gold** | Gold Muted | `#A08C69` | Secondary accents, disabled states |

**Tailwind theme tokens (reference):**
- `background`: black / cream
- `primary` / `accent`: gold
- `secondary` / `accent-red`: deep red
- `muted`: warm gray, gold muted

---

## Typography

| Use | Font | Tailwind / CSS | Notes |
|-----|------|----------------|--------|
| **Display / brand** | Serif (e.g. Cinzel, Playfair Display) | `font-serif` / `font-display` | Headings, “Fidelis” wordmark, hero |
| **Body** | Sans-serif (e.g. Lato, Source Sans 3) | `font-sans` | Body copy, UI, nav |
| **Motto / detail** | Same serif, smaller | `font-serif text-sm` | “JUDE 1:3”, captions |

- Headings: uppercase optional for hero/brand; sentence case for content.
- Letter-spacing: slightly increased for display serif (`tracking-wide`).

---

## Logo Usage

- **Primary:** Full logo (wordmark + shield + JUDE 1:3) on black or cream.
- **Icon only:** Shield + cross only for favicon, small nav, social.
- **Files:** Use provided assets (e.g. `Fidelis_ONLY_Transparent`, `Large_Transparent_Logo`) for light/dark contexts.
- **Clear space:** Minimum padding around logo; do not stretch or distort.

---

## Buttons

- **Primary:** Gold background (`fidelis-gold`), dark text or black; hover slightly lighter gold.
- **Secondary:** Outline gold on black/cream; fill on hover.
- **Destructive:** Red accent for delete/danger.
- **Style:** Subtle radius (e.g. `rounded-md`), no heavy shadows; optional subtle border.

---

## Spacing & Radius

- **Spacing:** Generous padding for sections; 8px grid (e.g. 4, 8, 16, 24, 32, 48, 64).
- **Radius:** `rounded-md` (e.g. 6px) for cards, buttons; `rounded-sm` for inputs.
- **Borders:** 1px; gold or warm gray; avoid busy borders.

---

## UI Primitives (shadcn/ui)

- Base components on shadcn/ui; override with brand colors (gold, red, black, cream).
- Inputs: cream/white background on light sections; dark inputs on black with gold focus ring.
- Cards: subtle border (gold or warm gray), cream or black background by context.

---

## Storefront vs Admin

- **Storefront:** Full brand (gold, red, black, cream); serif for hero/headings; sans for body.
- **Admin:** Same palette for consistency; slightly more neutral (gray) for tables/charts; gold for primary actions.
