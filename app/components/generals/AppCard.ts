import { html, css } from "/utils/markup";
import type { AppSummary } from "/types/app-types";
import { useLocation } from "preact-iso";
import { getLang } from "/utils/lang";
import { t } from "/utils/i18n";
import { appPageUrl, appEditUrl } from "/utils/app-url";
import { user } from "/app/stores/userStore";

type Props = {
  app: AppSummary;
};

const PREVIEW_EMOJIS = ["📱", "✨", "🎯", "📋", "🧩", "⚡", "🎨", "🔧", "📊", "🎮"];

const PREVIEW_GRADIENTS = [
  "linear-gradient(145deg, var(--primary-400), var(--primary-700))",
  "linear-gradient(145deg, oklch(72% 0.14 230), oklch(52% 0.16 260))",
  "linear-gradient(145deg, oklch(78% 0.12 160), oklch(58% 0.14 190))",
  "linear-gradient(145deg, oklch(75% 0.13 330), oklch(55% 0.15 350))",
  "linear-gradient(145deg, oklch(74% 0.12 55), oklch(58% 0.14 35))",
];

function accentIndex(slug: string, count: number): number {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % count;
}

function previewEmoji(slug: string): string {
  return PREVIEW_EMOJIS[accentIndex(slug, PREVIEW_EMOJIS.length)] ?? "📱";
}

function previewGradient(slug: string): string {
  return PREVIEW_GRADIENTS[accentIndex(slug, PREVIEW_GRADIENTS.length)] ?? PREVIEW_GRADIENTS[0]!;
}

export default function AppCard({ app }: Props) {
  const { path } = useLocation();
  const lang = getLang(path ?? "") ?? "en";
  const emoji = previewEmoji(app.slug);
  const gradient = previewGradient(app.slug);
  const canEdit = user.value?.id === app.ownerId;

  const view = html`
    <article class="app-card" data-scope="AppCard" style=${{ "--card-gradient": gradient }}>
      <a href=${appPageUrl(lang, app.slug)} class="card-link">
        <div class="preview" aria-hidden="true">
          <span class="emoji">${emoji}</span>
        </div>
        <div class="content">
          <h3 class="title">${app.title}</h3>
          <p class="description">${app.description}</p>
        </div>
      </a>
      ${canEdit
        ? html`
          <div class="actions">
            <a class="edit-btn" href=${appEditUrl(lang, app.slug)} ui-button="secondary sm">
              ${t("Edit")}
            </a>
          </div>`
        : ""}
    </article>
  `;

  const style = css`
    @scope ([data-scope="AppCard"]) to ([data-scope]) {
      & {
        display: flex;
        flex-direction: column;
        height: 100%;
        border: 1px solid var(--neutral-200);
        border-radius: 1.25rem;
        background: var(--white);
        color: inherit;
        overflow: hidden;
        box-shadow:
          0 1px 2px oklch(from var(--neutral-900) l c h / 4%),
          0 12px 32px -20px oklch(from var(--primary-900) l c h / 18%);
        transition:
          transform 0.2s ease,
          border-color 0.2s ease,
          box-shadow 0.2s ease;
      }

      &:hover {
        transform: translateY(-3px);
        border-color: var(--primary-200);
        box-shadow:
          0 2px 4px oklch(from var(--neutral-900) l c h / 5%),
          0 24px 48px -24px oklch(from var(--primary-900) l c h / 28%);
      }

      .card-link {
        display: flex;
        flex-direction: column;
        flex: 1;
        color: inherit;
        text-decoration: none;
      }

      .preview {
        display: grid;
        place-items: center;
        aspect-ratio: 16 / 10;
        background: var(--card-gradient);
        border-bottom: 1px solid oklch(from var(--white) l c h / 12%);
      }

      .emoji {
        font-size: 2.75rem;
        line-height: 1;
        filter: drop-shadow(0 2px 8px oklch(from var(--neutral-900) l c h / 20%));
      }

      .content {
        display: flex;
        flex-direction: column;
        flex: 1;
        gap: 0.5rem;
        padding: 1.125rem 1.25rem 1rem;
      }

      .title {
        font-family: "Noto Serif", serif;
        font-size: 1.0625rem;
        font-weight: 700;
        line-height: 1.25;
        letter-spacing: -0.02em;
        text-wrap: balance;
      }

      .description {
        flex: 1;
        color: var(--neutral-600);
        font-size: 0.875rem;
        line-height: 1.55;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .actions {
        padding: 0 1.25rem 1.25rem;
      }

      .edit-btn {
        display: flex;
        width: 100%;
        justify-content: center;
        text-decoration: none;
      }
    }
  `;

  return [view, style];
}
