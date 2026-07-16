import { html, css } from "/utils/markup";
import { useEffect, useState } from "preact/hooks";
import { t } from "/utils/i18n";
import { apps, loadApps, clearApps } from "/app/stores/appStore";
import { isLoggedIn, user } from "/app/stores/userStore";
import AppIcon from "/app/components/home/AppIcon";
import DraftIcon from "/app/components/home/DraftIcon";

export default function AppLauncher() {
  const list = apps.value;
  const loggedInUser = user.value;
  const readyApps = list.filter((app) => !app.isDraft);
  const draftApps = list.filter((app) => app.isDraft);
  const [editing, setEditing] = useState(false);
  const hasApps = readyApps.length > 0 || draftApps.length > 0;

  useEffect(() => {
    if (loggedInUser) {
      void loadApps();
    } else {
      clearApps();
      setEditing(false);
    }
  }, [loggedInUser?.id]);

  useEffect(() => {
    if (!hasApps) setEditing(false);
  }, [hasApps]);

  const view = html`
    <div data-scope="AppLauncher" ui-column="gap-2xl" ui-margin="top-xl">
      <section ui-column="gap-lg">
        <div ui-row="x-between y-center gap-md">
          <h2 ui-heading>${t("My Applets")}</h2>
          ${isLoggedIn() && hasApps
            ? html`
              <button
                type="button"
                ui-button="inline sm"
                onClick=${() => setEditing((v) => !v)}
              >
                ${editing ? t("Done") : t("Edit")}
              </button>`
            : ""}
        </div>

        ${!isLoggedIn()
          ? html`
            <div ui-card ui-column="gap-md x-center" ui-padding="block-3xl inline-xl" class="empty">
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
            <div class=${editing ? "grid editing" : "grid"}>
              ${readyApps.map(
                (app) => html`<${AppIcon} app=${app} editing=${editing} />`,
              )}
            </div>
            ${readyApps.length === 0
              ? html`
                <p class="hint" ui-margin="top-lg">
                  ${t("Use Create Applet to build your first app.")}
                </p>`
              : editing
                ? html`<p class="hint" ui-margin="top-lg">${t("Tap an applet to edit it.")}</p>`
                : ""}`}
      </section>

      ${isLoggedIn() && draftApps.length > 0
        ? html`
          <section ui-column="gap-lg">
            <h2 ui-heading>${t("Drafts")}</h2>
            <div class=${editing ? "grid editing" : "grid"}>
              ${draftApps.map(
                (app) => html`<${DraftIcon} app=${app} editing=${editing} />`,
              )}
            </div>
          </section>`
        : ""}
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
