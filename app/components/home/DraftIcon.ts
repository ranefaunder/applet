import { html, css } from "/utils/markup";
import type { AppSummary } from "/types/app-types";
import { useLocation } from "preact-iso";
import { getLang } from "/utils/lang";
import { t } from "/utils/i18n";
import { appEditUrl } from "/utils/app-url";
import { draftAccentColor, draftLetter } from "/utils/app-preview";

type Props = {
  app: AppSummary;
  editing?: boolean;
  onDelete?: (app: AppSummary) => void;
};

export default function DraftIcon({ app, editing = false, onDelete }: Props) {
  const { path } = useLocation();
  const lang = getLang(path ?? "") ?? "en";
  const color = draftAccentColor(app.slug);
  const letter = draftLetter(app.title);

  function handleDelete(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.(app);
  }

  const view = html`
    <a
      class=${editing ? "draft-icon editing" : "draft-icon"}
      data-scope="DraftIcon"
      href=${appEditUrl(lang, app.slug)}
      aria-label=${t("Edit $title", { title: app.title })}
      style=${{ "--draft-color": color }}
    >
      <span class="glyph-wrap">
        <span class="glyph" aria-hidden="true">${letter}</span>
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
    @scope ([data-scope="DraftIcon"]) to ([data-scope]) {
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
        border: 2px dashed var(--draft-color);
        background: color-mix(in oklch, var(--draft-color) 14%, white);
        color: var(--draft-color);
        font-size: clamp(1.25rem, 5vw, 1.75rem);
        font-weight: 700;
        line-height: 1;
        letter-spacing: -0.02em;
        transition: transform 0.15s ease, background 0.15s ease;
      }

      &:not(.editing):hover .glyph,
      &:not(.editing):focus-visible .glyph {
        transform: scale(1.04);
        background: color-mix(in oklch, var(--draft-color) 22%, white);
      }

      &:not(.editing):active .glyph {
        transform: scale(0.96);
      }

      &.editing .glyph-wrap {
        animation: draft-jiggle 0.35s ease-in-out infinite alternate;
      }

      &.editing:nth-child(even) .glyph-wrap {
        animation-delay: -0.12s;
        animation-direction: alternate-reverse;
      }

      @keyframes draft-jiggle {
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
        color: var(--neutral-600);
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
