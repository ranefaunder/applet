import { html, css } from "/utils/markup";
import type { AppSummary } from "/types/app-types";
import { useLocation } from "preact-iso";
import { getLang } from "/utils/lang";
import { t } from "/utils/i18n";
import { appPageUrl } from "/utils/app-url";
import { appIconSrc } from "/utils/app-icon";
import { previewGradient, draftLetter } from "/utils/app-preview";

type Props = {
  app: AppSummary;
};

export default function AppIcon({ app }: Props) {
  const { path } = useLocation();
  const lang = getLang(path ?? "") ?? "en";
  const iconSrc = appIconSrc(app.iconId);
  const gradient = previewGradient(app.slug);
  const letter = draftLetter(app.title);

  const view = html`
    <a
      class="app-icon"
      data-scope="AppIcon"
      ui-column="gap-sm x-center"
      href=${appPageUrl(lang, app.slug)}
      aria-label=${t("Open $title", { title: app.title })}
      style=${{ "--icon-gradient": gradient }}
    >
      <span class="glyph-wrap">
        ${iconSrc
          ? html`<img class="glyph-img" src=${iconSrc} alt="" width="128" height="128" decoding="async" />`
          : html`<span class="glyph" aria-hidden="true">${letter}</span>`}
      </span>
      <span class="label">${app.title}</span>
    </a>
  `;

  const style = css`
    @scope ([data-scope="AppIcon"]) to ([data-scope]) {
      & {
        color: inherit;
        text-decoration: none;
        -webkit-tap-highlight-color: transparent;
      }

      .glyph-wrap {
        width: 100%;
        aspect-ratio: 1;
      }

      .glyph,
      .glyph-img {
        display: grid;
        place-items: center;
        width: 100%;
        height: 100%;
        border-radius: 22.5%;
        box-shadow:
          0 1px 2px oklch(from var(--neutral-900) l c h / 8%),
          0 8px 20px -10px oklch(from var(--primary-900) l c h / 35%);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }

      .glyph {
        background: var(--icon-gradient);
        font-size: clamp(1.25rem, 5vw, 1.75rem);
        font-weight: 700;
        line-height: 1;
        color: var(--white);
      }

      .glyph-img {
        object-fit: cover;
        background: var(--neutral-200);
      }

      &:hover .glyph,
      &:hover .glyph-img,
      &:focus-visible .glyph,
      &:focus-visible .glyph-img {
        transform: scale(1.04);
        box-shadow:
          0 2px 4px oklch(from var(--neutral-900) l c h / 10%),
          0 12px 28px -12px oklch(from var(--primary-900) l c h / 40%);
      }

      &:active .glyph,
      &:active .glyph-img {
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
