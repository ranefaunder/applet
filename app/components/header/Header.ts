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
    <header ui-container="lg" class="app-header" data-scope="Header">
      <a href=${`/${lang}/`} class="logo" aria-label="Applet">
        <span class="logo-icon" aria-hidden="true">
          <span class="logo-icon-letter faunder-logo-font">A</span>
        </span>
        <span class="logo-text faunder-logo-font">Applet</span>
      </a>
      <nav class="navigation">
        <a href="/${lang}/" ui-button="inline">${t("Create")}</a>
        ${isLoggedIn()
          ? html`<a href="/${lang}/apps" ui-button="inline">${t("My apps")}</a>`
          : ""}
      </nav>
      <div class="user-actions">
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
            <a href=${`/${lang}/settings`} ui-button="inline sm" class="settings-link">
              ${t("Settings")}
            </a>`
          : html`
            <button type="button" ui-button="inline sm" class="login-button" commandfor="login-dialog" command="show-modal">
              ${t("Login")}
            </button>
            <button type="button" ui-button="primary sm" class="register-button" commandfor="register-dialog" command="show-modal">
              ${t("Register")}
            </button>`}
      </div>
    </header>
  `;

  const style = css`
    @scope ([data-scope="Header"]) to ([data-scope]) {
      & {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 2rem;
        padding-block: 0.75rem;
        z-index: 100;
      }

      .navigation {
        display: none;
        align-items: center;
        flex-grow: 1;
        gap: 1.5rem;
      }

      .navigation,
      .settings-link,
      .login-button,
      .register-button {
        display: none;
      }

      .logo {
        display: flex;
        align-items: center;
        gap: 0.5rem;
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

      .user-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .language-button {
        text-transform: uppercase;
        font-size: 0.875rem;
        font-weight: 500;
      }

      @media (min-width: 800px) {
        .navigation {
          display: flex;
        }

        .settings-link,
        .login-button,
        .register-button {
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
