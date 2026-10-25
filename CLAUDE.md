# Postcraft AI project guide

Read README.md, SECURITY.md and docs/architecture.md before changing authentication or deployment.

The stack is React 19, TypeScript and Vite with lazy-loaded tools. Static component CSS lives in src/styles. API logic lives in api/ and is mounted unchanged by server/app.js. Server secrets come from environment variables, never browser input. The Vite proxy only forwards to the local API server. Use src/api.ts for authenticated client requests and withSession for protected server routes.

Run npm test, npm run format:check, npm run build and npm run test:e2e before opening a PR. Automated tests use fake providers and must never publish real posts.

## UI Design System

### Philosophy
Futuristic dark-space aesthetic. A personal content workspace. Every element must feel intentional.

### Color Palette
| Role | Value |
|------|-------|
| App background | `#060611` |
| Panel surface | `rgba(10,10,26,0.6)` |
| Card/input bg | `#0a0a1e` |
| Border default | `#1a1a2e` / `#1e1e38` |
| Border active | `#4f8ef755` |
| Text primary | `#e2e0f0` |
| Text secondary | `#2e2e52` |
| Accent blue | `#4f8ef7` |
| Accent green | `#34d399` |
| Accent gold | `#fbbf24` |
| Accent purple | `#a78bfa` |
| Error | `#fca5a5` on `#160808` |

### Typography
- Labels/monospace: `'Courier New', monospace` — UPPERCASE, 9-11px, letter-spacing 2-3px
- Body/editorial: `'Georgia', 'Times New Roman', serif`
- LinkedIn preview: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

### Effects
- **Background**: Fixed ambient orbs (blur 80px) + CSS grid overlay (48px grid, 1.5% opacity)
- **Glassmorphism**: `backdrop-filter: blur(8-12px)` on panels
- **Glow on active**: `box-shadow: 0 0 12px {color}15` + matching border
- **Button shimmer**: `::before` pseudo with `translateX(-100% → 100%)` on hover
- **Generate button**: Animated gradient via `background-size: 200%` + `gradientShift` keyframe
- **Input focus**: `box-shadow: 0 0 0 3px {accent}10` ring + border color change
- **Fade-in mount**: `.app-root` starts `opacity:0`, adds `.mounted` class in `useEffect`

### Animations
| Name | Usage |
|------|-------|
| `floatOrb` | Background orbs — gentle 12s float |
| `pulseDot` | Live indicator dot in header |
| `gradientShift` | Generate button gradient scroll |
| `spin` | Loading spinner |
| `blink` | Typewriter cursor |
| `fadeInUp` | Output area, error box appear |

### Component Pattern
All sub-components (`FieldSection`, `ChipGroup`, `StatPill`, `UsageRow`) are defined at the bottom of the file with TypeScript interfaces. They use `className` (CSS in `<style>`) not inline styles, except for dynamic values like `color`.

### Chip Colors
Three semantic color variants via CSS classes: `chip--blue`, `chip--green`, `chip--gold`.
Active state: translucent background + matching glow shadow.

### Layout
- Fixed 320px left sidebar + fluid right panel via CSS Grid
- Left panel scrollable with thin (3px) custom scrollbar
- Right panel max-width 620px for output content

---

## When Updating UI
1. Keep the dark-space color system — do not introduce light backgrounds except the LinkedIn preview card
2. All new interactive elements need hover + focus + active states
3. New animations must use `ease` or `ease-in-out` — avoid linear except for spinners
4. Maintain the `Courier New` monospace for all metadata/labels
5. Typography hierarchy: gradient title → white primary → `#e2e0f0` body → `#2e2e52` secondary
