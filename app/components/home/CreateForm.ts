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

export default function CreateForm() {
  const lang = getLang(typeof window !== "undefined" ? window.location.pathname : "/en/") ?? "en";
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(false);
  const [placeholderIndex] = useState(() => Math.floor(Math.random() * EXAMPLES.length));

  async function handleSubmit(e: Event) {
    e.preventDefault();
    const prompt = inputRef.current?.value.trim();
    if (!prompt) return;

    if (!isLoggedIn()) {
      (document.getElementById("register-dialog") as HTMLDialogElement | null)?.showModal();
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
    <header data-scope="CreateForm" ui-container="md">
      <div class="content">
        <a class="back" href=${`/${lang}/`}>
          ← ${t("My Applets")}
        </a>
        <h1 ui-heading="xxl" class="title">
          ${t("Create Applet")}
        </h1>
        <p class="subtitle">
          ${t("Describe what you need in plain language. Applet builds your app in minutes — no code required.")}
        </p>

        <form class="prompt-form" onSubmit=${handleSubmit}>
          <textarea
            id="app-prompt"
            ref=${inputRef}
            rows="3"
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
    </header>
  `;

  const style = css`
    @scope ([data-scope="CreateForm"]) to ([data-scope]) {
      & {
        container-type: inline-size;
        position: relative;
        padding-top: 2rem;
        padding-bottom: 3rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        overflow: hidden;
      }

      &::before {
        content: "";
        position: absolute;
        inset: -40% -20% auto -20%;
        height: 40rem;
        background:
          radial-gradient(50% 40% at 50% 0%, oklch(from var(--primary-300) l c h / 30%), transparent 70%),
          radial-gradient(40% 30% at 80% 10%, oklch(from var(--primary-200) l c h / 40%), transparent 70%);
        z-index: -1;
        pointer-events: none;
      }

      .content {
        width: 100%;
        max-width: 36rem;
      }

      .back {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        margin-bottom: 1.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--neutral-600);
        text-decoration: none;
      }

      .back:hover {
        color: var(--neutral-900);
      }

      .title {
        font-size: clamp(2rem, 4vw + 0.75rem, 2.75rem);
        line-height: 1.1;
        letter-spacing: -0.02em;
        margin-bottom: 0.875rem;
      }

      .subtitle {
        font-size: 1.0625rem;
        color: var(--neutral-600);
        text-wrap: balance;
        line-height: 1.6;
        margin-bottom: 2rem;
      }

      .prompt-form {
        display: flex;
        flex-direction: column;
        gap: 0.875rem;
        background: oklch(from var(--white) l c h / 90%);
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
        resize: vertical;
        min-height: 5rem;
        padding: 0.75rem 0.875rem;
        border: 1px solid transparent;
        border-radius: 0.875rem;
        background: var(--neutral-50);
        font: inherit;
        font-size: 16px;
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
    }
  `;

  return [view, style];
}
