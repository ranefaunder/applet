import { html, css } from "/utils/markup";
import type { AppSummary } from "/types/app-types";
import { useLocation } from "preact-iso";
import { getLang } from "/utils/lang";
import { appPageUrl } from "/utils/app-url";
import { previewEmoji, previewGradient } from "/utils/app-preview";

type Props = {
  app: AppSummary;
};

export default function AppIcon({ app }: Props) {
  const { path } = useLocation();
  const lang = getLang(path ?? "") ?? "en";
  const emoji = previewEmoji(app.slug);
  const gradient = previewGradient(app.slug);

  const view = html`
    <a
      class="app-icon"
      data-scope="AppIcon"
      href=${appPageUrl(lang, app.slug)}
      style=${{ "--icon-gradient": gradient }}
    >
      <span class="glyph" aria-hidden="true">${emoji}</span>
      <span class="label">${app.title}</span>
    </a>
  `;

  const style = css`
    @scope ([data-scope="AppIcon"]) to ([data-scope]) {
      & {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        color: inherit;
        text-decoration: none;
        -webkit-tap-highlight-color: transparent;
      }

      .glyph {
        display: grid;
        place-items: center;
        width: 100%;
        aspect-ratio: 1;
        border-radius: 22.5%;
        background: var(--icon-gradient);
        font-size: clamp(1.5rem, 6vw, 2rem);
        line-height: 1;
        box-shadow:
          0 1px 2px oklch(from var(--neutral-900) l c h / 8%),
          0 8px 20px -10px oklch(from var(--primary-900) l c h / 35%);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }

      &:hover .glyph,
      &:focus-visible .glyph {
        transform: scale(1.04);
        box-shadow:
          0 2px 4px oklch(from var(--neutral-900) l c h / 10%),
          0 12px 28px -12px oklch(from var(--primary-900) l c h / 40%);
      }

      &:active .glyph {
        transform: scale(0.96);
      }

      .label {
        width: 100%;
        font-size: 0.75rem;
        font-weight: 500;
        line-height: 1.25;
        text-align: center;
        color: var(--neutral-800);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        word-break: break-word;
      }
    }
  `;

  return [view, style];
}
