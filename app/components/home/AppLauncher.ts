import { html, css } from "/utils/markup";
import { useEffect, useState } from "preact/hooks";
import { t } from "/utils/i18n";
import { apps, loadApps, clearApps, deleteApp } from "/app/stores/appStore";
import { isLoggedIn, user } from "/app/stores/userStore";
import type { AppSummary } from "/types/app-types";
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

  function requestDelete(app: AppSummary) {
    const ok = window.confirm(t("Delete \"$title\"? This cannot be undone.", { title: app.title }));
    if (!ok) return;
    void deleteApp(app.slug);
  }

  const view = html`
    <div data-scope="AppLauncher">
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">${t("My Applets")}</h2>
          ${isLoggedIn() && hasApps
            ? html`
              <button
                type="button"
                class="edit-toggle"
                onClick=${() => setEditing((v) => !v)}
              >
                ${editing ? t("Done") : t("Edit")}
              </button>`
            : ""}
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
            <div class=${editing ? "grid editing" : "grid"}>
              ${readyApps.map(
                (app) => html`<${AppIcon} app=${app} editing=${editing} onDelete=${requestDelete} />`,
              )}
            </div>
            ${readyApps.length === 0
              ? html`
                <p class="hint">
                  ${t("Use Create Applet to build your first app.")}
                </p>`
              : editing
                ? html`<p class="hint">${t("Tap an applet to edit it. Tap × to delete.")}</p>`
                : ""}`}
      </section>

      ${isLoggedIn() && draftApps.length > 0
        ? html`
          <section class="section drafts">
            <div class="section-header">
              <h2 class="section-title">${t("Drafts")}</h2>
            </div>
            <div class=${editing ? "grid editing" : "grid"}>
              ${draftApps.map(
                (app) => html`<${DraftIcon} app=${app} editing=${editing} onDelete=${requestDelete} />`,
              )}
            </div>
          </section>`
        : ""}
    </div>
  `;

  const style = css`
    @scope ([data-scope="AppLauncher"]) to ([data-scope]) {
      & {
        margin-top: 2rem;
      }

      .section + .section {
        margin-top: 2.5rem;
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

      .edit-toggle {
        border: none;
        background: none;
        padding: 0.25rem 0.125rem;
        font: inherit;
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--primary-600);
        cursor: pointer;
      }

      .edit-toggle:hover {
        color: var(--primary-700);
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 1.25rem 0.875rem;
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
