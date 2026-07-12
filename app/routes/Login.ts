import { html, css } from "/utils/markup";
import type { RoutePropsForPath } from "preact-iso";
import { useLocation } from "preact-iso";
import { useEffect } from "preact/hooks";
import { t } from "/utils/i18n";
import { user } from "/app/stores/userStore";

export const LoginPath = "/:lang/login" as const;

export default function Login({ params }: RoutePropsForPath<typeof LoginPath>) {
  const { route, query } = useLocation();
  const { lang } = params;
  const nextPath =
    query.next && query.next.startsWith("/") && !query.next.startsWith("//")
      ? query.next
      : `/${lang}/`;

  function redirectIfLoggedIn() {
    if (user.value) route(nextPath, true);
  }
  useEffect(() => redirectIfLoggedIn(), [user.value, nextPath, route]);

  if (user.value) return null;

  const view = html`
    <div data-scope="Login" ui-container="sm">
      <header ui-margin="bottom-lg">
        <h1 ui-heading="lg">${t("Login")}</h1>
      </header>

      <div ui-card ui-padding="lg" ui-column="gap-md">
        <p class="login-intro">${t("Sign in to apply your ideas")}</p>
        <div ui-row="gap-sm" class="login-actions">
          <button type="button" ui-button="primary" commandfor="login-dialog" command="show-modal">
            ${t("Login")}
          </button>
          <button type="button" ui-button="secondary" commandfor="register-dialog" command="show-modal">
            ${t("Register")}
          </button>
        </div>
      </div>
    </div>
  `;

  const style = css`
    @scope ([data-scope="Login"]) to ([data-scope]) {
      & {
        padding-block: 2rem;
      }

      .login-intro {
        color: var(--neutral-600);
      }
    }
  `;

  return [view, style];
}
