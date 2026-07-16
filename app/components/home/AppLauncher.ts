import { html, css } from "/utils/markup";
import { useEffect } from "preact/hooks";
import { t } from "/utils/i18n";
import { apps, loadApps, clearApps } from "/app/stores/appStore";
import { isLoggedIn, user } from "/app/stores/userStore";
import { getLang } from "/utils/lang";
import { useLocation } from "preact-iso";
import AppIcon from "/app/components/home/AppIcon";

export default function AppLauncher() {
  const { path } = useLocation();
  const lang = getLang(path ?? "") ?? "en";
  const list = apps.value;
  const loggedInUser = user.value;

  useEffect(() => {
    if (loggedInUser) {
      void loadApps();
    } else {
      clearApps();
    }
  }, [loggedInUser?.id]);

  const view = html`
    <section data-scope="AppLauncher">
      <div class="section-header">
        <h2 class="section-title">${t("My Applets")}</h2>
      </div>

      ${!isLoggedIn()
        ? html`
          <div class="empty">
            <p ui-heading="sm">${t("Sign in to open your applets")}</p>
            <button
              type="button"
              ui-button="primary"
              onClick=${() => (document.getElementById("login-dialog") as HTMLDialogElement | null)?.showModal()}
            >
              ${t("Login")}
            </button>
          </div>`
        : html`
          <div class="grid">
            ${list.map((app) => html`<${AppIcon} app=${app} />`)}
            <a class="new-tile" href=${`/${lang}/create`}>
              <span class="new-glyph" aria-hidden="true">+</span>
              <span class="label">${t("New Applet")}</span>
            </a>
          </div>
          ${list.length === 0
            ? html`
              <p class="hint">
                ${t("Tap New Applet to build your first app.")}
              </p>`
            : ""}`}
    </section>
  `;

  const style = css`
    @scope ([data-scope="AppLauncher"]) to ([data-scope]) {
      & {
        margin-top: 2rem;
      }

      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.25rem;
      }

      .section-title {
        font-size: 1.125rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        color: var(--neutral-900);
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 1.25rem 0.875rem;
      }

      .new-tile {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        color: inherit;
        text-decoration: none;
        -webkit-tap-highlight-color: transparent;
      }

      .new-glyph {
        display: grid;
        place-items: center;
        width: 100%;
        aspect-ratio: 1;
        border-radius: 22.5%;
        border: 2px dashed var(--primary-400);
        background: oklch(from var(--primary-50) l c h / 70%);
        color: var(--primary-600);
        font-size: clamp(1.75rem, 7vw, 2.25rem);
        font-weight: 400;
        line-height: 1;
        transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
      }

      .new-tile:hover .new-glyph,
      .new-tile:focus-visible .new-glyph {
        transform: scale(1.04);
        background: var(--primary-100);
        border-color: var(--primary-500);
      }

      .new-tile:active .new-glyph {
        transform: scale(0.96);
      }

      .new-tile .label {
        width: 100%;
        font-size: 0.75rem;
        font-weight: 500;
        line-height: 1.25;
        text-align: center;
        color: var(--neutral-800);
      }

      .hint {
        margin-top: 1.5rem;
        text-align: center;
        font-size: 0.875rem;
        color: var(--neutral-500);
      }

      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 3rem 1.5rem;
        text-align: center;
        border: 1px solid var(--neutral-200);
        border-radius: 1.25rem;
        background: var(--white);
        color: var(--neutral-600);
      }

      @media (min-width: 640px) {
        .grid {
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 1.5rem 1.25rem;
        }
      }

      @media (min-width: 960px) {
        .grid {
          grid-template-columns: repeat(6, minmax(0, 1fr));
        }
      }
    }
  `;

  return [view, style];
}
