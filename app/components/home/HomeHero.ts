import { html, css } from "/utils/markup";
import { useRef, useState } from "preact/hooks";
import { t } from "/utils/i18n";
import { getLang } from "/utils/lang";
import { isLoggedIn } from "/app/stores/userStore";
import { apiFetch } from "/utils/api.client";
import { appPageUrl } from "/utils/app-url";

const EXAMPLES = [
  "tracking my camping gear",
  "a wine journal",
  "my reading list",
  "a home maintenance log",
  "a recipe collection",
];

const PREVIEW_APPS = [
  { emoji: "🏃", name: "Run Log" },
  { emoji: "📚", name: "Reading List" },
  { emoji: "💸", name: "Budget" },
  { emoji: "🧴", name: "Skincare" },
  { emoji: "🎯", name: "Habits" },
  { emoji: "🍲", name: "Recipes" },
];

export default function HomeHero() {
  const lang = getLang(typeof window !== "undefined" ? window.location.pathname : "/en/") ?? "en";
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(false);
  const [placeholderIndex] = useState(() => Math.floor(Math.random() * EXAMPLES.length));

  async function handleSubmit(e: Event) {
    e.preventDefault();
    const prompt = inputRef.current?.value.trim();
    if (!prompt) return;

    if (!isLoggedIn()) {
      document.getElementById("register-dialog")?.showModal?.();
      return;
    }

    setLoading(true);
    try {
      const result = await apiFetch<{ id: string; slug: string }>(`/api/${lang}/app/generate`, {
        method: "POST",
        body: JSON.stringify({ prompt, language: lang }),
      });
      if (result.success) {
        window.location.assign(appPageUrl(lang, result.data.slug));
      }
    } finally {
      setLoading(false);
    }
  }

  const view = html`
    <header data-scope="HomeHero" ui-container="md">
      <div class="content">
        <p class="eyebrow">
          <span class="dot" aria-hidden="true"></span>
          ${t("Apply your ideas as apps")}
        </p>
        <h1 ui-heading="xxl" class="title">
          ${t("Build Personal Apps for Your Needs.")}
        </h1>
        <p class="subtitle">
          ${t("Describe what you need in plain language. Appliet builds your app in minutes — no code required.")}
        </p>

        <form class="prompt-form" onSubmit=${handleSubmit}>
          <textarea
            id="app-prompt"
            ref=${inputRef}
            rows="2"
            aria-label=${t("Create an app for…")}
            placeholder=${`${t("Create an app for…")} ${EXAMPLES[placeholderIndex]}.`}
            disabled=${loading}
          ></textarea>
          <div class="actions">
            <button type="submit" ui-button="primary" disabled=${loading}>
              ${loading ? t("Applying your idea…") : t("Apply It")}
            </button>
          </div>
        </form>
        <p class="hint">
          ${isLoggedIn() ? t("Every idea deserves its own app.") : t("Sign in to apply your ideas")}
        </p>
      </div>

      <div class="showcase" aria-hidden="true">
        <div class="showcase-window">
          <div class="window-bar">
            <span class="light red"></span>
            <span class="light yellow"></span>
            <span class="light green"></span>
          </div>
          <div class="window-body">
            ${PREVIEW_APPS.map(
              (app) => html`
                <div class="app-tile">
                  <span class="app-emoji">${app.emoji}</span>
                  <span class="app-name">${app.name}</span>
                </div>
              `,
            )}
          </div>
        </div>
      </div>
    </header>
  `;

  const style = css`
    @scope ([data-scope="HomeHero"]) to ([data-scope]) {
      & {
        container-type: inline-size;
        position: relative;
        padding-top: 4.5rem;
        padding-bottom: 4rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        overflow: hidden;
      }

      &::before {
        content: "";
        position: absolute;
        inset: -40% -20% auto -20%;
        height: 60rem;
        background:
          radial-gradient(50% 40% at 50% 0%, oklch(from var(--primary-300) l c h / 35%), transparent 70%),
          radial-gradient(40% 30% at 80% 10%, oklch(from var(--primary-200) l c h / 45%), transparent 70%),
          radial-gradient(40% 30% at 15% 15%, oklch(from var(--primary-100) l c h / 60%), transparent 70%);
        z-index: -1;
        pointer-events: none;
      }

      .content {
        max-width: 56rem;
        text-align: center;
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.375rem 0.875rem;
        border-radius: 999px;
        background: oklch(from var(--white) l c h / 70%);
        border: 1px solid var(--neutral-200);
        backdrop-filter: blur(8px);
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--neutral-700);
        margin-bottom: 1.5rem;
        box-shadow: 0 1px 2px oklch(from var(--neutral-900) l c h / 5%);
      }

      .dot {
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 999px;
        background: var(--primary-500);
        box-shadow: 0 0 0 3px oklch(from var(--primary-500) l c h / 20%);
      }

      .title {
        max-width: 54rem;
        margin-inline: auto;
        font-size: clamp(2.25rem, 5vw + 0.75rem, 3.75rem);
        line-height: 1.05;
        letter-spacing: -0.02em;
        text-wrap: pretty;
        margin-bottom: 1.25rem;
      }

      .subtitle {
        font-size: clamp(1.0625rem, 1vw + 0.75rem, 1.25rem);
        color: var(--neutral-600);
        text-wrap: balance;
        line-height: 1.6;
        max-width: 38rem;
        margin-inline: auto;
        margin-bottom: 2rem;
      }

      .prompt-form {
        display: flex;
        flex-direction: column;
        gap: 0.875rem;
        text-align: left;
        background: oklch(from var(--white) l c h / 85%);
        backdrop-filter: blur(12px);
        border: 1px solid var(--neutral-200);
        border-radius: 1.25rem;
        padding: 1rem;
        box-shadow:
          0 1px 2px oklch(from var(--neutral-900) l c h / 5%),
          0 20px 40px -24px oklch(from var(--primary-900) l c h / 25%);
      }

      textarea {
        width: 100%;
        resize: none;
        min-height: 3.5rem;
        padding: 0.75rem 0.875rem;
        border: 1px solid transparent;
        border-radius: 0.875rem;
        background: var(--neutral-50);
        font: inherit;
        font-size: 1rem;
        line-height: 1.5;
        transition: border-color 0.15s ease, background 0.15s ease;
      }

      textarea:focus {
        outline: none;
        background: var(--white);
        border-color: var(--primary-400);
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.625rem;
      }

      .actions [ui-button] {
        flex: 1;
        min-width: 9rem;
        justify-content: center;
      }

      .hint {
        margin-top: 1rem;
        font-size: 0.8125rem;
        color: var(--neutral-500);
      }

      .showcase {
        width: 100%;
        max-width: 52rem;
        margin-top: 3.5rem;
      }

      .showcase-window {
        border-radius: 1.25rem;
        border: 1px solid var(--neutral-200);
        background: var(--white);
        overflow: hidden;
        box-shadow:
          0 2px 4px oklch(from var(--neutral-900) l c h / 4%),
          0 40px 80px -40px oklch(from var(--primary-900) l c h / 30%);
      }

      .window-bar {
        display: flex;
        gap: 0.5rem;
        padding: 0.875rem 1rem;
        border-bottom: 1px solid var(--neutral-100);
        background: var(--neutral-50);
      }

      .window-bar .light {
        width: 0.75rem;
        height: 0.75rem;
        border-radius: 999px;
        background: var(--neutral-300);
      }

      .window-bar .red { background: #ff5f57; }
      .window-bar .yellow { background: #febc2e; }
      .window-bar .green { background: #28c840; }

      .window-body {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.875rem;
        padding: 1.5rem;
      }

      .app-tile {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.625rem;
        aspect-ratio: 4 / 3;
        border-radius: 1rem;
        border: 1px solid var(--neutral-150, var(--neutral-100));
        background: linear-gradient(160deg, var(--white), var(--neutral-50));
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .app-tile:hover {
        transform: translateY(-3px);
        box-shadow: 0 12px 24px -16px oklch(from var(--primary-900) l c h / 40%);
      }

      .app-emoji {
        font-size: 1.75rem;
        line-height: 1;
      }

      .app-name {
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--neutral-600);
      }

      @container (max-width: 640px) {
        .window-body {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    }
  `;

  return [view, style];
}
