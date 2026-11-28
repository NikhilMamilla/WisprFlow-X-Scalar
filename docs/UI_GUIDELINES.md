# UI guidelines

The rules the screens follow. They are checked by hand in a browser at the sizes listed below.

## Type scale (rem, so browser zoom works)
| Token | Size | Use |
| --- | --- | --- |
| `--fs-display` | 2rem (2.5rem from 768px) | landing and screen headline |
| `--fs-h2` | 1.5rem | section and results headings |
| `--fs-question` | 1.5rem | the one question on screen |
| `--fs-h3` | 1.25rem | card titles |
| `--fs-body` | 1.125rem | main text |
| `--fs-small` | 1rem | secondary text |
| `--fs-meta` | 0.875rem | labels, dates, chips (never smaller) |

Hindi and Telugu get line-height 1.65 and are never uppercased or letter-spaced.

## Spacing and shape
- 8px grid: `--sp-1` (8px) to `--sp-8` (64px).
- One card radius (16px), one pill radius, one shadow.

## Interaction
- Targets are at least 48px high with 8px between them; primary buttons are 56px.
- Visible 3px focus ring on everything focusable.
- One primary action per screen. Haan and Nahi have equal visual weight.
- Focus moves to the screen heading on every screen change; the question is in a polite live region.
- Honour `prefers-reduced-motion`.

## Layout
- The shell is header / screen / footer and is exactly one viewport (`100dvh`) when the content fits.
- Voice screens (language, story, read-back, question, conflict) must not scroll.
- No horizontal scroll down to 320px. No inner scroll areas. No element overlaps another.
- No `position: fixed` except the skip link.

## Colour
- Only the tokens in `theme.css`. Body text contrast at least 4.5:1.
- Status is always written out, never colour alone.

## Sizes checked
375x667, 375x812, 412x915, 768x1024, 1024x768, 1366x768.
