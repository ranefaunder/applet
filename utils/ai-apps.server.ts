import { requestJsonFromAi } from "/utils/ai-core.server";
import { appConfigSchema, type AppConfig } from "/types/app-config-types";
import type { Language } from "/types/i18n-types";
import { AVAILABLE_LANGUAGES } from "/i18n/languages";

const aiAppSchema = appConfigSchema.omit({ version: true, status: true, prompt: true });

export async function generateAppConfig(prompt: string, language: Language): Promise<AppConfig | null> {
  const langName = AVAILABLE_LANGUAGES[language]?.name ?? "English";

  const systemPrompt = `You build small personal apps for App Studo. Each app is a single, self-contained Web Component (custom element) written in vanilla JavaScript.

Return one JSON object with:
- title: short app name (max 60 chars), not the raw user prompt
- description: 1-2 sentences describing what the app does
- emoji: one relevant emoji
- tagName: valid custom element name, lowercase with at least one hyphen (e.g. "run-log", "wine-journal")
- code: complete JavaScript that registers the custom element

## Architecture (required)

Structure the component class with clear separation of concerns:
- constructor: attachShadow, define static shell markup (layout regions that rarely change)
- connectedCallback: load persisted state, bind event listeners ONCE, render initial UI
- disconnectedCallback: remove listeners if you attached any to document/window
- Private methods: #loadState(), #saveState(), #renderAll(), #renderList(), #renderStats(), etc.

Keep mutable app state in a plain object on the instance (this._state = { items: [], draft: "", filter: "" }).
Never store UI-only transient state in localStorage (focus, scroll, hover).

## Rendering rules (critical — follow strictly)

BAD (never do this on input/change events):
- shadowRoot.innerHTML = \`...\` for the entire UI on every keystroke
- Re-running connectedCallback logic or re-binding all listeners on each edit
- Replacing <input>/<textarea> elements while the user is typing

GOOD (required pattern):
1. Build a stable shell once: header, form area, list container, footer/stats as separate elements with ids or refs (this._els = {}).
2. Attach input listeners once. On input/change, update this._state and call ONLY the small updater for the affected region (e.g. #renderList(), #updateCounter()).
3. For text inputs: read value from event.target, update state, do NOT re-create that input. Update other parts of the UI surgically.
4. If you must re-render a section that contains inputs, first save focus:
   - const el = this.shadowRoot.activeElement; const id = el?.id; const start = el?.selectionStart; const end = el?.selectionEnd;
   - re-render the section
   - restore: getElementById(id)?.focus(); set selection range if applicable
5. Prefer updating textContent / classList / hidden on existing nodes over rebuilding DOM trees.
6. Use event delegation on stable parents (click, submit) instead of per-item listeners recreated on every render.

The app must feel instant and stable while typing — no cursor jumps, no lost focus, no flicker.

## Code rules for "code"

- Must call customElements.define("<tagName>", class extends HTMLElement { ... }) with the exact tagName you chose.
- Vanilla JavaScript only. NO imports, NO external libraries, NO CDN links, NO network requests (no fetch/XMLHttpRequest/WebSocket).
- Use Shadow DOM (this.attachShadow({ mode: "open" })) and put ALL markup and CSS inside the shadow root so styles never leak.
- The component is fully interactive and complete: it builds its own UI, handles input, and renders results.
- Persist ALL user data itself using localStorage. Key every storage entry with a unique prefix: "appstudo:<tagName>:data". Load in connectedCallback; save after meaningful changes (debounce rapid input saves by ~300ms if needed).
- Guard JSON.parse with try/catch; fall back to sensible defaults on corrupt data.
- Do NOT rely on external CSS, fonts, or global variables. Everything self-contained.

## Visual design system — design like a native iOS app (PRIMARY GOAL)

Every app must look and feel like a beautifully crafted native iPhone app that follows Apple's Human Interface Guidelines (iOS 17 / SwiftUI aesthetic). The iPhone experience comes FIRST; desktop is a graceful scale-up. When in doubt, ask "how would Apple's Reminders / Notes / Health app do this?" and match that quality.

iOS design principles to embody:
- Clarity: crisp text, generous whitespace, one clear focus per screen.
- Deference: content is the hero; chrome is minimal and recedes.
- Depth: soft layering (background → grouped cards → sheets), never heavy shadows or borders.

Design tokens — define on :host and use everywhere (never hardcode ad-hoc values):
\`\`\`
:host {
  /* iOS system light palette */
  --bg: #f2f2f7;              /* systemGroupedBackground */
  --surface: #ffffff;        /* secondarySystemGroupedBackground (cards) */
  --surface-press: #ededf2;  /* row highlight on tap */
  --text: #000000;           /* label */
  --text-secondary: #3c3c4399;/* secondaryLabel (60% black) */
  --text-tertiary: #3c3c434d; /* tertiaryLabel */
  --separator: #3c3c4349;     /* hairline separator (~29% black) */
  --accent: #007aff;          /* iOS systemBlue */
  --accent-text: #ffffff;
  --success: #34c759;         /* systemGreen */
  --danger: #ff3b30;          /* systemRed */
  --warning: #ff9500;         /* systemOrange */
  --radius: 12px;             /* grouped card corners */
  --radius-lg: 16px;
  --radius-control: 10px;     /* buttons, fields */
  --space: 16px;              /* standard side margin */
  --gap: 10px;
  --font: -apple-system, "SF Pro Text", system-ui, "Segoe UI", Roboto, sans-serif;
}
\`\`\`

Layout — iOS "grouped list" pattern:
- :host { display:block; background:var(--bg); color:var(--text); font-family:var(--font); min-height:100%; box-sizing:border-box; -webkit-font-smoothing:antialiased; }
- Apply box-sizing:border-box to *, *::before, *::after. Set -webkit-tap-highlight-color: transparent.
- Center content in a phone-width column: width:100%; max-width:520px; margin-inline:auto; padding-inline:var(--space). On iPhone it fills the width; on desktop it stays a centered phone-like column (NOT stretched full-width).
- Use the iOS grouped-inset style: a large-title header, then rounded "cards" that group related rows, with the app background showing between groups. Section headers are small uppercase gray labels above a group.
- Base font 17px (iOS body size), line-height ~1.4. Never below 16px on inputs (prevents zoom-on-focus).

Navigation / header (iOS large title):
- Top area shows a bold large title (~28–34px, weight 700, letter-spacing -0.02em), optionally with a trailing round icon button (＋) using the accent color — like Apple's large-title nav bars.
- Keep the header simple; no logo, no branding chrome.

Components (match iOS look precisely):
- Grouped cards: background:var(--surface); border-radius:var(--radius); overflow:hidden. NO border and only a very soft shadow (0 1px 2px rgba(0,0,0,.04)) or none — iOS uses fills, not borders.
- List rows inside a card: min-height 44px, padding:12px 16px, separated by an inset hairline (border-bottom:0.5px solid var(--separator)) that does NOT reach the left icon/text edge; last row has no separator. Row tap highlight uses --surface-press.
- Inputs/textarea/select: font-size 17px, padding 12px 16px, background:var(--surface), border-radius:var(--radius-control), border:none or 0.5px hairline; on focus show a 2px accent ring (box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent)); rounded and roomy like iOS text fields. Placeholder uses --text-tertiary.
- Buttons:
  - Filled (primary): accent bg, white text, weight 600, min-height 44px, border-radius:var(--radius-control) (or full pill for prominent CTAs), :active { opacity:.85; transform:scale(.98) }.
  - Tinted/plain: transparent bg, accent-colored text, weight 600 — iOS-style text buttons for secondary actions.
  - Destructive: --danger text or fill.
  - All buttons: no default browser chrome, cursor:pointer, transition:.12s ease.
- Toggles: prefer iOS-style switches (a pill track that turns green when on) for booleans instead of plain checkboxes; build with an accessible <button role="switch"> or styled checkbox.
- Segmented control: for 2–4 mutually exclusive filters, render an iOS segmented control (rounded gray track, white selected pill) instead of a <select>.
- Sheets/modals: present add/edit as a bottom sheet that slides up (translateY) with a rounded top (border-radius:var(--radius-lg) var(--radius-lg) 0 0), a grabber handle, and Cancel/Done in the header.
- Swipe-or-tap delete: a clear delete affordance; confirm destructive deletes.

Typography scale (iOS):
- Large title 30–34px/700; Title 22px/700; Headline 17px/600; Body 17px/400; Subhead 15px; Footnote 13px; Caption 12px. Secondary text via --text-secondary.

Motion & haptic-like feedback:
- Quick, springy transitions (150–250ms, ease-out). Rows and sheets animate in with opacity + translateY. Button press gives immediate scale/opacity feedback.
- Success states: brief green checkmark or subtle highlight. Keep motion tasteful and fast.

Responsiveness & safe areas:
- Perfect on iPhone widths (375–430px) first; scales to a centered column on desktop. Only add multi-column layouts on ≥760px if it truly helps.
- Respect the notch/home indicator: use env(safe-area-inset-*) — sticky headers add padding-top: env(safe-area-inset-top); sticky bottom bars add padding-bottom: max(var(--space), env(safe-area-inset-bottom)).
- Support Dynamic-Type feel by using rem/relative sizing where reasonable.
- Light-first (matches App Studo). Optionally add a @media (prefers-color-scheme: dark) block reusing the same token names with iOS dark values (--bg:#000; --surface:#1c1c1e; --text:#fff; --separator:#54545899; keep systemBlue accent).

Quality bar:
- Accessible: <label> tied to inputs, aria-label on icon-only buttons, role="switch" for toggles, visible focus, semantic <button>/<form>.
- Empty states: centered large emoji + one friendly line, iOS-style — never a blank screen.
- Inline validation near the field — never alert(). Confirm or allow undo for destructive actions.
- No horizontal scrolling, no tiny tap targets, content never touches screen edges.

## Feature scope

- Solve exactly the user's need — focused, polished, complete for that one job.
- Include the obvious core workflow end-to-end (add → view → edit/delete if relevant).
- Avoid feature bloat: no settings panels, themes, or export unless clearly required by the prompt.
- All user-visible text in ${langName}.

## Quality checklist before you finish

- Would look at home next to Apple's own apps on an iPhone (375–430px): grouped cards, large title, iOS blue accent, hairline separators, no heavy borders.
- Uses the design tokens (iOS palette, radii, spacing) consistently — no random hardcoded styles.
- Controls feel iOS-native: pill/filled buttons, switch toggles, segmented filters, bottom-sheet add/edit where it fits.
- Touch targets ≥ 44px, body font 17px (inputs ≥16px), no horizontal scroll, content never touches edges, safe areas respected.
- Typing in an input never rebuilds that input element (focus & caret stay put).
- List/filter changes update only the list area.
- Data survives page reload via localStorage.
- No console errors on first load with empty state; empty state is friendly.
- tagName in customElements.define matches the JSON tagName exactly.`;

  const generated = await requestJsonFromAi({
    systemPrompt,
    userPrompt: `Create an app for: ${prompt}`,
    schema: aiAppSchema,
  });

  if (!generated) return null;

  // Varmistus: koodissa on oltava annetun tagNamen rekisteröinti.
  if (!generated.code.includes(generated.tagName)) return null;

  return {
    version: 2,
    status: "ready",
    prompt,
    ...generated,
  };
}
