import { html, css } from "/utils/markup";
import type { AppSummary } from "/types/app-types";
import { useLocation } from "preact-iso";
import { getLang } from "/utils/lang";
import { t } from "/utils/i18n";
import { appPageUrl, appEditUrl } from "/utils/app-url";
import { previewEmoji, previewGradient } from "/utils/app-preview";

type Props = {
  app: AppSummary;
  editing?: boolean;
  onDelete?: (app: AppSummary) => void;
};

export default function AppIcon({ app, editing = false, onDelete }: Props) {
  const { path } = useLocation();
  const lang = getLang(path ?? "") ?? "en";
  const emoji = previewEmoji(app.slug);
  const gradient = previewGradient(app.slug);
  const href = editing ? appEditUrl(lang, app.slug) : appPageUrl(lang, app.slug);
  const label = editing
    ? t("Edit $title", { title: app.title })
    : t("Open $title", { title: app.title });

  function handleDelete(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.(app);
  }

  const view = html`
    <a
      class=${editing ? "app-icon editing" : "app-icon"}
      data-scope="AppIcon"
      href=${href}
      aria-label=${label}
      style=${{ "--icon-gradient": gradient }}
    >
      <span class="glyph-wrap">
        <span class="glyph" aria-hidden="true">${emoji}</span>
        ${editing
          ? html`
            <button
              type="button"
              class="delete-badge"
              aria-label=${t("Delete $title", { title: app.title })}
              onClick=${handleDelete}
            >
              ×
            </button>`
          : ""}
      </span>
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

      .glyph-wrap {
        position: relative;
        width: 100%;
        aspect-ratio: 1;
      }

      .glyph {
        display: grid;
        place-items: center;
        width: 100%;
        height: 100%;
        border-radius: 22.5%;
        background: var(--icon-gradient);
        font-size: clamp(1.5rem, 6vw, 2rem);
        line-height: 1;
        box-shadow:
          0 1px 2px oklch(from var(--neutral-900) l c h / 8%),
          0 8px 20px -10px oklch(from var(--primary-900) l c h / 35%);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }

      &:not(.editing):hover .glyph,
      &:not(.editing):focus-visible .glyph {
        transform: scale(1.04);
        box-shadow:
          0 2px 4px oklch(from var(--neutral-900) l c h / 10%),
          0 12px 28px -12px oklch(from var(--primary-900) l c h / 40%);
      }

      &:not(.editing):active .glyph {
        transform: scale(0.96);
      }

      &.editing .glyph-wrap {
        animation: applet-jiggle 0.35s ease-in-out infinite alternate;
      }

      &.editing:nth-child(even) .glyph-wrap {
        animation-delay: -0.12s;
        animation-direction: alternate-reverse;
      }

      @keyframes applet-jiggle {
        from { transform: rotate(-1.4deg); }
        to { transform: rotate(1.4deg); }
      }

      @media (prefers-reduced-motion: reduce) {
        &.editing .glyph-wrap {
          animation: none;
        }
      }

      .delete-badge {
        position: absolute;
        top: -0.3rem;
        left: -0.3rem;
        display: grid;
        place-items: center;
        width: 1.4rem;
        height: 1.4rem;
        padding: 0;
        border: none;
        border-radius: 999px;
        background: var(--neutral-500);
        color: var(--white);
        font-size: 1.125rem;
        font-weight: 500;
        line-height: 1;
        cursor: pointer;
        box-shadow: 0 1px 3px oklch(from var(--neutral-900) l c h / 25%);
      }

      .delete-badge:hover {
        background: var(--danger, #ff3b30);
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
