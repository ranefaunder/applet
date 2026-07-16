import { html, css } from "/utils/markup";
import type { RoutePropsForPath } from "preact-iso";
import { useEffect } from "preact/hooks";
import { t } from "/utils/i18n";
import { apps, loadApps, clearApps, deleteApp } from "/app/stores/appStore";
import { isLoggedIn, user } from "/app/stores/userStore";
import type { AppSummary } from "/types/app-types";
import { appEditUrl } from "/utils/app-url";
import { appIconSrc } from "/utils/app-icon";
import { previewGradient, draftAccentColor, draftLetter } from "/utils/app-preview";

export const EditAppsPath = "/:lang/edit" as const;

export default function EditApps({ params }: RoutePropsForPath<typeof EditAppsPath>) {
  const lang = params.lang ?? "en";
  const list = apps.value;
  const loggedInUser = user.value;
  const draftApps = list.filter((app) => app.isDraft);
  const readyApps = list.filter((app) => !app.isDraft);

  useEffect(() => {
    if (loggedInUser) {
      void loadApps();
    } else {
      clearApps();
    }
  }, [loggedInUser?.id]);

  function requestDelete(app: AppSummary) {
    const ok = window.confirm(t("Delete \"$title\"? This cannot be undone.", { title: app.title }));
    if (!ok) return;
    void deleteApp(app.slug);
  }

  const view = html`
    <div data-scope="EditApps" ui-container="md" ui-padding="block-lg" ui-column="gap-xl">
      <header>
        <h1 ui-heading="lg">${t("Edit")}</h1>
      </header>

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
        : list.length === 0
          ? html`
            <div ui-card ui-column="gap-md x-center" ui-padding="block-3xl inline-xl" class="empty">
              <p>${t("Use Create to build your first app.")}</p>
              <a href=${`/${lang}/create`} ui-button="primary">${t("Create")}</a>
            </div>`
          : html`
            ${draftApps.length > 0
              ? html`
                <section ui-column="gap-md">
                  <h2 ui-heading>${t("Drafts")}</h2>
                  <ul class="list" ui-column="gap-sm">
                    ${draftApps.map((app) => html`<${AppEditRow} app=${app} lang=${lang} onDelete=${requestDelete} />`)}
                  </ul>
                </section>`
              : ""}
            ${readyApps.length > 0
              ? html`
                <section ui-column="gap-md">
                  <h2 ui-heading>${t("Apps")}</h2>
                  <ul class="list" ui-column="gap-sm">
                    ${readyApps.map((app) => html`<${AppEditRow} app=${app} lang=${lang} onDelete=${requestDelete} />`)}
                  </ul>
                </section>`
              : ""}`}
    </div>
  `;

  const style = css`
    @scope ([data-scope="EditApps"]) to ([data-scope]) {
      .empty {
        text-align: center;
        color: var(--neutral-600);
      }

      .list {
        list-style: none;
        margin: 0;
        padding: 0;
      }
    }
  `;

  return [view, style];
}

function AppEditRow({
  app,
  lang,
  onDelete,
}: {
  app: AppSummary;
  lang: string;
  onDelete: (app: AppSummary) => void;
}) {
  const iconSrc = appIconSrc(app.iconId);
  const gradient = previewGradient(app.slug);
  const draftColor = draftAccentColor(app.slug);
  const letter = draftLetter(app.title);

  const view = html`
    <li class="row" data-scope="AppEditRow" ui-row="y-center gap-md" ui-padding="sm">
      ${iconSrc
        ? html`<img class="icon-img" src=${iconSrc} alt="" width="40" height="40" decoding="async" />`
        : app.isDraft
          ? html`
            <span
              class="icon draft"
              aria-hidden="true"
              style=${{ "--draft-color": draftColor }}
            >${letter}</span>`
          : html`
            <span
              class="icon"
              aria-hidden="true"
              style=${{ "--icon-gradient": gradient }}
            >${letter}</span>`}
      <span class="name">${app.title}</span>
      <div class="actions" ui-row="gap-xs">
        <a href=${appEditUrl(lang, app.slug)} ui-button="sm">${t("Edit")}</a>
        <button
          type="button"
          ui-button="tertiary sm"
          ui-icon="trash"
          aria-label=${t("Delete")}
          onClick=${() => onDelete(app)}
        ></button>
      </div>
    </li>
  `;

  const style = css`
    @scope ([data-scope="AppEditRow"]) to ([data-scope]) {
      & {
        border: 1px solid var(--neutral-200);
        border-radius: 0.875rem;
        background: var(--white);
      }

      .icon,
      .icon-img {
        flex-shrink: 0;
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 0.625rem;
      }

      .icon {
        display: grid;
        place-items: center;
        background: var(--icon-gradient);
        font-size: 1rem;
        font-weight: 700;
        line-height: 1;
        color: var(--white);
      }

      .icon.draft {
        border: 1.5px dashed var(--draft-color);
        background: color-mix(in oklch, var(--draft-color) 14%, white);
        color: var(--draft-color);
      }

      .icon-img {
        object-fit: cover;
        background: var(--neutral-200);
      }

      .name {
        flex: 1;
        min-width: 0;
        font-weight: 600;
        color: var(--neutral-900);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .actions {
        flex-shrink: 0;
      }
    }
  `;

  return [view, style];
}
