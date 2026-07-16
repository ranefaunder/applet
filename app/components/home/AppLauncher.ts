import { html, css } from "/utils/markup";
import { useEffect } from "preact/hooks";
import { t } from "/utils/i18n";
import { apps, loadApps, clearApps } from "/app/stores/appStore";
import { isLoggedIn, user } from "/app/stores/userStore";
import AppIcon from "/app/components/home/AppIcon";

export default function AppLauncher() {
  const loggedInUser = user.value;
  const readyApps = apps.value.filter((app) => !app.isDraft);

  useEffect(() => {
    if (loggedInUser) {
      void loadApps();
    } else {
      clearApps();
    }
  }, [loggedInUser?.id]);

  const view = html`
    <div data-scope="AppLauncher">
      ${!isLoggedIn()
        ? html`
          <div ui-card ui-column="gap-md x-center" ui-padding="block-3xl inline-xl" class="empty">
            <p ui-heading="sm">${t("Sign in to open your apps")}</p>
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
            ${readyApps.map((app) => html`<${AppIcon} app=${app} />`)}
          </div>
          ${readyApps.length === 0
            ? html`
              <p class="hint" ui-margin="top-lg">
                ${t("Use Create to build your first app.")}
              </p>`
            : ""}`}
    </div>
  `;

  const style = css`
    @scope ([data-scope="AppLauncher"]) to ([data-scope]) {
      .grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 1.25rem 0.875rem;
      }

      .hint {
        text-align: center;
        font-size: 0.875rem;
        color: var(--neutral-500);
      }

      .empty {
        text-align: center;
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
