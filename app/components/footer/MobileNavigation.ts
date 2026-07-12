import { html, css } from "/utils/markup";
import { useLocation } from "preact-iso";
import { getLang } from "/utils/lang";
import { t } from "/utils/i18n";

export default function MobileNavigation() {
  const { path: locationPath } = useLocation();
  const lang = getLang(locationPath ?? "") ?? "en";

  const view = html`
    <nav data-scope="MobileNavigation" ui-container="sm">
      <div class="items">
        <a class="item" href=${`/${lang}/`} aria-label=${t("Create")}>
          <i ui-icon="magic-wand xl"></i>
        </a>
        <a class="item" href=${`/${lang}/apps`} aria-label=${t("My applets")}>
          <i ui-icon="bookmarks xl"></i>
        </a>
        <a class="item" href=${`/${lang}/settings`} aria-label=${t("Settings")}>
          <i ui-icon="user-circle-gear xl"></i>
        </a>
      </div>
    </nav>
  `;

  const style = css`
    @scope ([data-scope="MobileNavigation"]) to ([data-scope]) {
      & {
        background: oklch(from var(--white) l c h / 70%);
        backdrop-filter: blur(10px);
        position: sticky;
        bottom: 0;
        width: 100%;
        z-index: 100;
        border-top: 1px solid oklch(from var(--neutral-900) l c h / 6%);
        padding-bottom: env(safe-area-inset-bottom, 0);
      }

      .items {
        display: flex;
        align-items: center;
        justify-content: space-evenly;
        margin-inline: auto;
      }

      .item {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        text-decoration: none;
        color: var(--neutral-600);
      }

      .item:hover {
        color: var(--neutral-800);
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
