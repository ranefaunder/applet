import { html, css } from "/utils/markup";
import type { RoutePropsForPath } from "preact-iso";
import { useEffect } from "preact/hooks";
import { t } from "/utils/i18n";
import { apps, loadApps, clearApps } from "/app/stores/appStore";
import AppCard from "/app/components/generals/AppCard";
import { isLoggedIn, user } from "/app/stores/userStore";
import { getLang } from "/utils/lang";
import { useLocation } from "preact-iso";

export const MyAppsPath = "/:lang/apps" as const;

export default function MyApps(_props: RoutePropsForPath<typeof MyAppsPath>) {
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
    <div data-scope="MyApps" ui-container="md" ui-margin="top-2xl">
      <header class="page-header">
        <p class="eyebrow">${t("Create")}</p>
        <h1 ui-heading="xl">${t("My apps")}</h1>
        <p class="subtitle">${t("Every idea deserves its own app.")}</p>
      </header>

      ${!isLoggedIn()
        ? html`
          <div class="empty">
            <span class="empty-icon" aria-hidden="true">🔐</span>
            <p ui-heading="sm">${t("Sign in to apply your ideas")}</p>
            <button type="button" ui-button="primary" onClick=${() => document.getElementById("login-dialog")?.showModal?.()}>
              ${t("Login")}
            </button>
          </div>`
        : list.length === 0
          ? html`
            <div class="empty">
              <span class="empty-icon" aria-hidden="true">✨</span>
              <p ui-heading="sm">${t("No apps yet")}</p>
              <p>${t("Describe your idea and see your first app in minutes.")}</p>
              <a href="/${lang}/" ui-button="primary">${t("Apply It")}</a>
            </div>`
          : html`
            <div class="grid">
              ${list.map((app) => html`<${AppCard} app=${app} />`)}
            </div>`}
    </div>
  `;

  const style = css`
    @scope ([data-scope="MyApps"]) to ([data-scope]) {
      & {
        padding-bottom: 6rem;
      }

      .page-header {
        max-width: 36rem;
        margin-bottom: 2.5rem;
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.375rem 0.875rem;
        border-radius: 999px;
        background: var(--white);
        border: 1px solid var(--neutral-200);
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--neutral-700);
        margin-bottom: 1rem;
      }

      .subtitle {
        margin-top: 0.75rem;
        font-size: 1.125rem;
        color: var(--neutral-600);
        line-height: 1.6;
        text-wrap: balance;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
        gap: 1.25rem;
      }

      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        padding: 4rem 2rem;
        text-align: center;
        border: 1px solid var(--neutral-200);
        border-radius: 1.25rem;
        background:
          radial-gradient(60% 80% at 50% 0%, oklch(from var(--primary-100) l c h / 60%), transparent 70%),
          var(--white);
        color: var(--neutral-600);
      }

      .empty-icon {
        font-size: 2rem;
        line-height: 1;
        margin-bottom: 0.25rem;
      }
    }
  `;

  return [view, style];
}
