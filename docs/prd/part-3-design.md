# Personal Finance Assistant — PRD

### Part 3: Design / UX / UI Requirements

_Status: Locked for MVP (Phase 1). Builds on Part 1 (Business) and Part 2 (Technical)._

_Revision (30 Sep 2026): Branding and Yuki illustration specs updated to match the final logo artwork (Section 7). The logo is now the source of truth for how Yuki looks._

---

## 1. Design Principles

**Tone: warm and friendly, deliberately not "finance-y."** Most finance apps default to navy, dark green, and dense tables that read as serious and a little intimidating. This app should feel more like a personal notebook than a bank statement — approachable enough that checking it daily feels easy, not like a chore.

- Lead with the month's overall picture, not a wall of numbers.
- Use warmth and rounded shapes rather than sharp corporate severity.
- Never shame the user for spending — tone stays neutral/supportive even on overspend, no red alarm treatments for normal life expenses.

## 2. Visual Direction

**Palette (updated to match the soft hand-drawn illustration direction):** warm cream paper tones, toast/caramel as the primary accent, warm brown-grey instead of black for lines and text, soft pink for small highlights. Income and expense colors are muted so they sit comfortably next to the illustrations.

| Token | Role | Light mode | Dark mode |
| --- | --- | --- | --- |
| `bg` | App background (paper) | `#F3ECE3` | `#241F1B` |
| `surface` | Cards | `#FFFDF9` | `#2E2823` |
| `border` | Hairlines, dividers | `#E6DCD0` | `#3D352E` |
| `ink` | Primary text, illustration line | `#5E524C` | `#EFE6DC` |
| `ink-soft` | Secondary text | `#978A80` | `#B3A699` |
| `accent` | Primary actions, highlights (toast crust) | `#C98A4B` | `#E0A866` |
| `accent-soft` | Selected chips, accent backgrounds (toast) | `#F1D9A8` | `#4A3823` |
| `pink` | Small highlights, badges | `#F2A9A6` | `#E8938F` |
| `income` | Positive / income | `#6F8F5E` | `#9DC089` |
| `expense` | Negative / expense | `#C4726A` | `#E3978F` |

Expense stays a muted rose, never alarm red, per the "kind" personality.

**Alignment with the logo:** the UI palette already sits in the same family as the logo, so the tokens above stay as they are. The logo tile cream (`#F6E9DA`) sits between `bg` and `accent-soft`, and Yuki's terracotta nose (`#BD7C62`) sits next to `accent`. The logo's near-black line (`#3E332D`) is for illustration only. UI text keeps `ink` for a softer reading contrast.

**Typography:** two clearly distinct families —

- **Headings & labels:** a rounded, friendly sans-serif (e.g. Nunito or Quicksand) — carries the approachable personality.
- **Numbers & body text:** a clean, highly legible grotesk (e.g. Inter) with tabular figures — financial numbers need to align and scan easily, which a rounded display face doesn't do well at small sizes.

**Light/dark mode:** both required, following system setting (per Business PRD decision). All colors defined as tokens, not hardcoded, so the palette flips automatically rather than needing separate designs.

**Reference mockup:** the dashboard preview shown earlier in this conversation demonstrates the direction — warm accent chips for categories, soft-tinted icons for transaction types, large balance figure leading the screen.

## 3. Information Architecture

**Primary screens (Phase 1):**

1. **Dashboard** (default landing screen, per Business PRD decision) — this month's balance, income vs. expense, top categories, recent transactions, quick-add action always reachable.
2. **Add transaction** — camera capture (QR/slip photo) or manual entry, shown as a lightweight flow rather than a full-page form.
3. **Transaction list** — full history, filterable by account/category/date.
4. **Transaction detail/edit** — view and correct any transaction, including OCR/QR-extracted ones.
5. **Categories & accounts** — manage the lists that power the dashboard.
6. **Settings** — theme (if overriding system), account, sign-out.

**Navigation pattern:** bottom tab bar (Dashboard / Add / Transactions / Settings) — standard, thumb-reachable mobile pattern, appropriate since this is phone-first.

## 4. Key Interaction Patterns

**Slip capture flow (ties to Part 2's technical pipeline):**

- Tap add → camera opens directly (not buried in a form) → photo taken → transaction appears immediately in an editable "processing" state → fields populate in place as QR decode or OCR completes → user confirms or edits → saved.
- This optimistic-UI pattern (decided in Part 2) means the person is never staring at a blank spinner — there's always something on screen to look at and, if needed, edit immediately.

**Retry vs. manual entry (per Part 2 decision):** when extraction fails, the transaction shows in a clearly incomplete state with two equally-weighted actions: "Retry" and "Enter manually" — neither is hidden or treated as a failure state requiring apology; it's a normal branch in the flow.

**Editing extracted data:** every OCR/QR-derived field is a normal editable field, not a locked "confirmed" value — no separate "edit mode" toggle needed.

**Upcoming recurring transactions (per Part 2 decision):** shown as a visually distinct "upcoming" row (not styled identically to a real past transaction) until the scheduled job creates the real entry.

## 5. Empty & Error States

Following a plain, direction-giving voice (say what happened and what to do next, no apology, no blame):

- **No transactions yet:** an invitation, not an apology — e.g. "Add your first expense" with the quick-add action front and center, not "Nothing here yet."
- **Extraction failed:** state what happened plainly, offer the two actions (retry / manual entry) — never a raw error string.
- **No recurring transactions set up:** same invitation pattern, pointing at "Add a recurring transaction."

## 6. Accessibility & Responsiveness Baseline

- Full responsiveness from phone width up to desktop, even though phone is the primary target.
- Visible keyboard focus states on all interactive elements.
- Color is never the only signal for income vs. expense — paired with icon direction (in/out arrows) so it's not color-dependent.
- Tap targets sized for real thumb use (minimum ~44px), given phone-first, one-handed usage during data entry.
- Reduced-motion respected for any transition/animation.

## 7. Branding

**Name: Yuki** — named after the product owner's Scottish longhair cat, framed as a quiet, detail-oriented companion helping manage the person's money, not a chatty assistant character.

**Personality (drives tone and interaction decisions throughout this doc):**

- **Shy** — quiet UI. No confetti, badges, streak-nagging, or exclamation-heavy copy. Minimal, restrained motion. Yuki appears only at a small, fixed set of moments (see Cat identity touchpoints below); the rest of the personality shows up structurally, not through constant self-reference.
- **Detail-oriented** — precision in substance: exact figures (never rounded for display), careful confirmation before saving, tidy categorization. Reflected already in the QR-decode-first extraction approach (Part 2) and editable-not-locked extracted fields (Section 4).
- **Kind** — no judgment in copy, ever. Overspending or a missed bill is stated as neutral information, never styled as an alarm or scolding. No shaming empty states or red "warning" banners for normal spending.
- **Considerate** — restraint in timing, not just tone. Reminders are sent once, plainly, not repeated or escalated. Routine edits to past entries don't require confirmation friction — trusting the user's judgment is part of being considerate.
- **Protective (occasionally bossy)** — quiet by default, but won't let something slide if it has real financial consequences. This is a bounded exception to "considerate," not a contradiction of it:

- **Stays quiet for:** routine spending, normal categorization, day-to-day patterns — stated once if at all, never repeated (per "considerate," above).
- **Gets insistent for:** a tax deadline approaching with nothing started, a loan payment now overdue, an uncategorized backlog piling up, a spending pattern that's genuinely unusual — not everyday overspend. These resurface until acknowledged or resolved, and the phrasing is firmer and more direct — never scolding, just less easy to dismiss, because it actually matters.

**Yuki is unmistakably a cat.** Every user, including a first-time tester who has never heard the backstory, should know within the first minute that Yuki is a cat. This is done through cat _behaviors_ at a few chosen moments, not a mascot talking on every screen, so it stays consistent with "shy."

**The real Yuki:** Scottish Straight longhair with upright, softly tufted ears (not folded). Shaded grey coat, darker across the forehead and back, with a pale cream-white muzzle, chin, and full chest ruff. Slightly heavy-lidded eyes with a serious, faintly furrowed brow. Soft pink nose. Round, flat face with full cheeks.

**Drawn Yuki (reference for all illustration): the logo.** The logo artwork (see Mark below) is the canonical drawing of Yuki. All other artwork matches it rather than the written description. Where the two differ, the logo wins. In particular, drawn Yuki has **dark slate-grey eyes** (not green-gold) and a **warm taupe-grey coat** (not silver-lilac). The traits that must stay in every drawing:

- Upright pointed ears with soft tufts and pale pink inner ear
- Darker tabby striping down the forehead, fading into a cream-white muzzle, chin and full chest ruff
- Large round dark eyes with a single white highlight, under straight, slightly lowered upper lids: the serious, detail-oriented look, not sleepy or cute-wide
- Small terracotta nose, a short flat mouth line, and fine white whiskers
- Round, chubby, very fluffy silhouette with a soft, broken fur outline

**Mark (final):** a watercolour illustration of Yuki lying in a "loaf" pose, facing the viewer with both front paws tucked forward, centered on a warm cream rounded-square tile. It replaces the earlier flat geometric face mark. The same artwork is used for the app icon, splash screen and onboarding.

| Asset | Variant | Use |
| --- | --- | --- |
| `7781E288-…png` | Primary: face straight on, symmetric | App icon, PWA manifest icons, splash, onboarding |
| `A0247CE1-…png` | Alternate: head turned slightly, one paw pad showing | Settings > About, secondary illustration moments |

**Icon production rules:**

- The source files have a white margin outside the rounded tile. Export icons as a **full-bleed square of the cream tile** (`#F6E9DA`) with no white corners and no pre-rounded edges. iOS and Android apply their own mask; a pre-rounded tile would show white corners.
- Keep Yuki inside the central ~80% of the square, so Android adaptive-icon and maskable-PWA cropping never clips the ears.
- **Small sizes (32px and below, e.g. favicon, tab icon):** the full-body pose loses legibility. Use a head-only crop (ears, forehead stripes, eyes, nose) on the same cream tile. If detail has to drop, keep the ear shape, the dark eyes and the brow. These are what make it read as Yuki. This replaces the current placeholder `favicon.svg`.
- Export sizes: 1024 (store), 512 and 192 (PWA manifest, incl. `maskable`), 180 (Apple touch icon), 32 and 16 (favicon, head crop).
- Do not recolour, add a border, or place the mark on a busy background. In dark mode the icon keeps its cream tile. The tile is part of the mark, not a theme surface.

**Yuki's colors (illustration only, sampled from the logo):**

| Part | Color |
| --- | --- |
| Tile / illustration backdrop | `#F6E9DA` |
| Coat, light | `#E5D9CE` |
| Coat, mid shading | `#D8C8B9` |
| Coat, darker stripes (forehead, back) | `#AF9D8B` |
| Ruff, muzzle, paws | `#F7F0E7` |
| Eye | `#495356` (dark slate), with a white highlight |
| Pupil / darkest eye | `#20150F` |
| Nose, paw pad | `#BD7C62` |
| Inner ear | `#FDCAB6` |
| Line work | `#3E332D` |

Line work is a warm near-black brown (`#3E332D`), darker than UI `ink`. It is broken and uneven, suggesting fur tufts rather than a clean continuous outline. Values are sampled from watercolour, so treat them as targets, not exact fills.

**Illustration style:** matches the logo: soft watercolour fills with visible paper texture and short directional brush strokes for fur, a broken dark-brown outline, big round dark eyes with one highlight, rounded chubby proportions, and no hard shadows or gradients. Each illustration sits on the cream tile colour or directly on `bg`, never on a saturated colour. Illustrations will be drawn by the product owner. The logo's loaf pose is the base pose; the other touchpoint poses (curled asleep, sitting on an item) are drawn in the same style, at the same scale of detail.

**Cat identity touchpoints (the complete set for MVP):**

| Moment | Cat behavior | Copy |
| --- | --- | --- |
| First launch / onboarding | Yuki introduces himself, the only time he speaks in first person | "Hi, I'm Yuki. I'm a cat. I'll keep an eye on your money, quietly. Mostly." |
| Slip processing | A paw print replaces the generic spinner | "Yuki is looking this over" |
| Empty states | Yuki curled up asleep | "Nothing logged yet. Yuki's napping until you add one." |
| Protective nudge | Yuki sitting on the item, like a cat on your paperwork | "Yuki is sitting on this until it's done: tax filing closes in 3 days." |
| Settings > About | A short note on the real Yuki, the owner's Scottish longhair | Written by the owner, one or two sentences |

**Restraint rule:** new cat touchpoints are added only when they replace something generic (a spinner, a blank state, a system notice), never as extra decoration on screens that already work. Routine screens (dashboard figures, transaction list, edit forms) stay plain. Cat-flavored copy is limited to the moments in the table above; everywhere else uses the plain voice below.

**Voice examples (plain, non-cat moments):**

| Moment | Copy |
| --- | --- |
| Extraction failed | "Couldn't read this one clearly. Retry or enter it yourself." |
| Spending pattern (informational, not a warning) | "You've spent more on food than usual this month." |
| Recurring reminder | "Rent is due in 3 days." |

## 8. Carried Forward / Not Yet Decided

- Visual design for Phase 2–4 screens (Tax Planner, Loan Repayment, Investment Planner) — to be designed when each phase is reached, following the same warm/friendly direction and Yuki's personality established here.
- Whether household/shared views (deferred feature) need a distinct visual treatment when eventually built.
- Dark-mode treatment of in-app illustrations (the icon itself keeps its cream tile): either keep the cream tile behind each illustration, or place Yuki directly on the dark `bg`. The fur outline is dark, so it may need a light edge. Decide once the first illustrations are drawn.
