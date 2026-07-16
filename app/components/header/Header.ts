import { html, css } from "/utils/markup";
import { useLocation } from "preact-iso";
import { AVAILABLE_LANGUAGES } from "/i18n/languages";
import { getLang } from "/utils/lang";
import { t } from "/utils/i18n";
import { isLoggedIn } from "/app/stores/userStore";

export default function Header() {
  const { path } = useLocation();
  const lang = getLang(path ?? "") ?? "en";

  function pathForLang(currentPath: string, langCode: string): string {
    const parts = (currentPath || "/").split("/").filter(Boolean);
    const rest = parts.slice(1).join("/");
    return rest ? `/${langCode}/${rest}` : `/${langCode}/`;
  }

  const view = html`
    <header
      ui-container="lg"
      ui-row="x-between y-center gap-xl"
      ui-padding="block-sm"
      class="app-header"
      data-scope="Header"
    >
      <a href=${`/${lang}/`} class="logo" ui-row="gap-sm y-center" aria-label="Applet">
        <span class="logo-icon" aria-hidden="true">
          <span class="logo-icon-letter faunder-logo-font">A</span>
        </span>
        <span class="logo-text faunder-logo-font">Abblet</span>
      </a>
      <nav class="navigation" ui-row="gap-lg y-center">
        <a href="/${lang}/" ui-button="inline">${t("My Applets")}</a>
        <a href="/${lang}/create" ui-button="inline">${t("Create")}</a>
      </nav>
      <div class="user-actions" ui-row="gap-sm y-center">
        <div ui-menu="bottom-left" ui-row>
          <button class="language-button" popovertarget="header-lang-menu" aria-label="Language" ui-button="inline sm" ui-icon="globe">
            ${lang}
          </button>
          <div id="header-lang-menu" popover="auto" role="menu">
            ${Object.entries(AVAILABLE_LANGUAGES).map(([langCode, { nativeName }]) => html`
              <a
                href=${pathForLang(path || "/", langCode)}
                role="menuitem"
                aria-current=${langCode === lang ? "true" : undefined}
                ui-icon="${langCode === lang ? "check" : "-"} trailing"
              >
                ${nativeName}
              </a>`
            )}
          </div>
        </div>

        ${isLoggedIn()
          ? html`
            <a href=${`/${lang}/settings`} ui-button="inline sm" class="desktop-only">
              ${t("Settings")}
            </a>`
          : html`
            <button type="button" ui-button="inline sm" class="desktop-only" commandfor="login-dialog" command="show-modal">
              ${t("Login")}
            </button>
            <button type="button" ui-button="primary sm" class="desktop-only" commandfor="register-dialog" command="show-modal">
              ${t("Register")}
            </button>`}
      </div>
    </header>
  `;

  const style = css`
    @scope ([data-scope="Header"]) to ([data-scope]) {
      & {
        z-index: 100;
      }

      .navigation,
      .desktop-only {
        display: none;
      }

      .logo {
        flex-shrink: 0;
        color: inherit;
        text-decoration: none;
      }

      .logo-icon {
        display: grid;
        place-items: center;
        width: 1.75rem;
        height: 1.75rem;
        border-radius: 0.4375rem;
        background: linear-gradient(145deg, var(--primary-500), var(--primary-700));
        box-shadow: 0 1px 2px oklch(from var(--primary-900) l c h / 22%);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }

      .logo-icon-letter {
        font-size: 1rem;
        line-height: 1;
        color: var(--white);
      }

      .logo-text {
        font-size: 1.375rem;
        line-height: 1;
        letter-spacing: -0.035em;
      }

      .logo:hover .logo-icon {
        transform: translateY(-1px);
        box-shadow: 0 2px 6px oklch(from var(--primary-900) l c h / 28%);
      }

      .language-button {
        text-transform: uppercase;
      }

      @media (min-width: 800px) {
        .navigation {
          display: flex;
          flex-grow: 1;
        }

        .desktop-only {
          display: inline-flex;
        }

        .logo-icon {
          width: 2rem;
          height: 2rem;
          border-radius: 0.5rem;
        }

        .logo-icon-letter {
          font-size: 1.125rem;
        }

        .logo-text {
          font-size: 1.75rem;
        }
      }
    }
  `;

  return [view, style];
}
