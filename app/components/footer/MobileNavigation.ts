import { html, css } from "/utils/markup";
import { useLocation } from "preact-iso";
import { getLang } from "/utils/lang";
import { t } from "/utils/i18n";

function isHomePath(path: string, lang: string): boolean {
  const normalized = path.replace(/\/+$/, "") || "/";
  return normalized === `/${lang}` || normalized === "";
}

function isEditPath(path: string, lang: string): boolean {
  return (
    (path.includes(`/${lang}/edit`) && !path.includes("/app/")) ||
    /\/app\/[^/]+\/edit\/?$/.test(path)
  );
}

function isCreatePath(path: string, lang: string): boolean {
  return path.includes(`/${lang}/create`);
}

function isSettingsPath(path: string, lang: string): boolean {
  return path.includes(`/${lang}/settings`);
}

export default function MobileNavigation() {
  const { path: locationPath } = useLocation();
  const path = locationPath ?? "";
  const lang = getLang(path) ?? "en";

  const view = html`
    <nav data-scope="MobileNavigation" ui-container="sm" aria-label=${t("Apps")}>
      <div class="items" ui-row="x-evenly y-stretch">
        <a
          class=${`item${isHomePath(path, lang) ? " active" : ""}`}
          href=${`/${lang}/`}
          ui-column="gap-xs x-center y-center"
          aria-label=${t("Apps")}
          aria-current=${isHomePath(path, lang) ? "page" : undefined}
        >
          <i ui-icon="bookmarks xl"></i>
          <span class="label">${t("Apps")}</span>
        </a>
        <a
          class=${`item${isEditPath(path, lang) ? " active" : ""}`}
          href=${`/${lang}/edit`}
          ui-column="gap-xs x-center y-center"
          aria-label=${t("Edit")}
          aria-current=${isEditPath(path, lang) ? "page" : undefined}
        >
          <i ui-icon="pencil xl"></i>
          <span class="label">${t("Edit")}</span>
        </a>
        <a
          class=${`item${isCreatePath(path, lang) ? " active" : ""}`}
          href=${`/${lang}/create`}
          ui-column="gap-xs x-center y-center"
          aria-label=${t("Create")}
          aria-current=${isCreatePath(path, lang) ? "page" : undefined}
        >
          <i ui-icon="magic-wand xl"></i>
          <span class="label">${t("Create")}</span>
        </a>
        <a
          class=${`item${isSettingsPath(path, lang) ? " active" : ""}`}
          href=${`/${lang}/settings`}
          ui-column="gap-xs x-center y-center"
          aria-label=${t("Settings")}
          aria-current=${isSettingsPath(path, lang) ? "page" : undefined}
        >
          <i ui-icon="user-circle-gear xl"></i>
          <span class="label">${t("Settings")}</span>
        </a>
      </div>
    </nav>
  `;

  const style = css`
    @scope ([data-scope="MobileNavigation"]) to ([data-scope]) {
      & {
        background: oklch(from var(--white) l c h / 85%);
        backdrop-filter: blur(12px);
        position: sticky;
        bottom: 0;
        width: 100%;
        z-index: 100;
        border-top: 1px solid oklch(from var(--neutral-900) l c h / 6%);
        padding-bottom: env(safe-area-inset-bottom, 0);
      }

      .item {
        flex: 1;
        padding: 0.625rem 0.25rem 0.75rem;
        text-decoration: none;
        color: var(--neutral-500);
      }

      .item:hover {
        color: var(--neutral-700);
      }

      .item.active {
        color: var(--primary-600);
      }

      .label {
        font-size: 0.625rem;
        font-weight: 600;
        letter-spacing: 0.01em;
        line-height: 1.2;
      }

      @media (min-width: 800px) {
        & {
          display: none;
        }
      }
    }
  `;

  return [view, style];
}
