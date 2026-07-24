import { html, css } from "/utils/markup";
import type { RoutePropsForPath } from "preact-iso";
import { useEffect } from "preact/hooks";
import { useRoute } from "preact-iso";
import { t } from "/utils/i18n";
import { appEditUrl, appPageUrl, exploreUrl } from "/utils/app-url";
import { appIconSrc } from "/utils/app-icon";
import { previewGradient, draftLetter } from "/utils/app-preview";
import { isLoggedIn } from "/app/stores/userStore";
import {
  clearStoreApp,
  installStoreApp,
  loadStoreApp,
  storeApp,
  storeBusy,
  storeError,
  storeLoading,
  uninstallStoreApp,
} from "/app/stores/exploreStore";
import type { AppCategory } from "/utils/app-categories";

export const StoreAppPath = "/:lang/store/:slug" as const;

export default function StoreApp(_props: RoutePropsForPath<typeof StoreAppPath>) {
  const { params } = useRoute();
  const lang = params.lang ?? "en";
  const slug = params.slug ?? "";
  const app = storeApp.value;
  const loading = storeLoading.value;
  const busy = storeBusy.value;
  const loggedIn = isLoggedIn();

  useEffect(() => {
    if (slug) void loadStoreApp(slug);
    return () => clearStoreApp();
  }, [slug]);

  async function onAddRemove() {
    if (!loggedIn) {
      (document.getElementById("login-dialog") as HTMLDialogElement | null)?.showModal();
      return;
    }
    if (!app) return;
    if (app.installed) {
      await uninstallStoreApp(app.slug);
      return;
    }
    await installStoreApp(app.slug);
  }

  const iconSrc = appIconSrc(app?.iconId);
  const gradient = previewGradient(slug);
  const letter = draftLetter(app?.title ?? "?");

  const view = html`
    <div data-scope="StoreApp" ui-column>
      <header
        class="topbar"
        ui-row="x-between y-center"
        ui-padding="inline-md block-sm"
      >
        <a
          href=${exploreUrl(lang)}
          ui-button="tertiary square sm"
          ui-icon="arrow-left"
          aria-label=${t("Back")}
        ></a>
        <span ui-heading="xs">${t("App")}</span>
        <span class="top-spacer" aria-hidden="true"></span>
      </header>

      ${loading && !app
        ? html`
          <div ui-column="gap-md x-center y-center" ui-padding="xl" class="state">
            <i ui-icon="spinner lg"></i>
            <p>${t("Loading…")}</p>
          </div>`
        : !app
          ? html`
            <div ui-column="gap-md x-center y-center" ui-padding="xl" class="state">
              <p>${storeError.value ?? t("App not found")}</p>
              <a href=${exploreUrl(lang)} ui-button="primary sm">${t("Explore")}</a>
            </div>`
          : html`
            <div class="content" ui-padding="inline-md block-md" ui-column="gap-lg x-center">
              <div ui-column="gap-sm x-center" class="hero">
                <span class="app-icon" style=${`background: ${gradient}`} aria-hidden="true">
                  ${iconSrc
                    ? html`<img src=${iconSrc} alt="" width="112" height="112" decoding="async" />`
                    : html`<span>${letter}</span>`}
                </span>
                <h1 ui-heading="lg">${app.title}</h1>
                <p class="tagline">${app.tagline || app.description}</p>
                ${app.ownerNickname
                  ? html`<p class="author">${t("By $name", { name: app.ownerNickname })}</p>`
                  : ""}
              </div>

              <div ui-row="gap-sm x-center wrap">
                ${app.installed
                  ? html`
                    <a ui-button="primary" href=${appPageUrl(lang, app.slug)}>
                      ${t("Open")}
                    </a>
                    ${app.isOwner
                      ? html`
                        <a ui-button href=${appEditUrl(lang, app.slug)}>
                          ${t("Edit")}
                        </a>`
                      : ""}
                    <button
                      type="button"
                      ui-button
                      disabled=${busy}
                      aria-busy=${busy}
                      onClick=${() => void onAddRemove()}
                    >
                      ${t("Remove")}
                    </button>`
                  : html`
                    <button
                      type="button"
                      ui-button="primary"
                      disabled=${busy}
                      aria-busy=${busy}
                      onClick=${() => void onAddRemove()}
                    >
                      ${t("Add")}
                    </button>
                    <a ui-button href=${appPageUrl(lang, app.slug)}>
                      ${t("Try")}
                    </a>`}
              </div>

              ${storeError.value
                ? html`<p ui-card="error" ui-padding="md" role="alert">${storeError.value}</p>`
                : ""}

              <section ui-card ui-padding="lg" ui-column="gap-md" class="panel">
                <div ui-row="gap-lg x-around">
                  <div ui-column="gap-xs x-center">
                    <strong>${app.installCount}</strong>
                    <small>${t("Adds")}</small>
                  </div>
                  ${app.category
                    ? html`
                      <div ui-column="gap-xs x-center">
                        <strong>${t(app.category as AppCategory)}</strong>
                        <small>${t("Category")}</small>
                      </div>`
                    : ""}
                </div>
                <hr />
                <div ui-column="gap-xs">
                  <h2 ui-heading="sm">${t("About")}</h2>
                  <p class="about">${app.description}</p>
                </div>
              </section>
            </div>`}
    </div>
  `;

  const style = css`
    @scope ([data-scope="StoreApp"]) to ([data-scope]) {
      & {
        flex: 1;
        min-height: 0;
        background: var(--neutral-50);
        overflow-y: auto;
      }

      .topbar {
        flex: none;
        position: sticky;
        top: 0;
        z-index: 2;
        background: color-mix(in oklab, var(--neutral-50) 86%, var(--white));
        backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--neutral-200);
      }

      .top-spacer {
        width: 2.25rem;
      }

      .state {
        flex: 1;
        color: var(--neutral-500);
        text-align: center;
      }

      .content {
        width: min(100%, 36rem);
        margin-inline: auto;
        padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
      }

      .hero {
        text-align: center;
      }

      .app-icon {
        width: 7rem;
        height: 7rem;
        border-radius: 1.5rem;
        overflow: hidden;
        display: grid;
        place-items: center;
        color: var(--white);
        font-size: 2.5rem;
        font-weight: 750;
        box-shadow: 0 10px 28px oklch(from var(--neutral-900) l c h / 18%);
      }

      .app-icon img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .tagline {
        margin: 0;
        max-width: 22rem;
        color: var(--neutral-600);
      }

      .author {
        margin: 0;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--primary-600);
      }

      .panel {
        width: 100%;
      }

      .panel small {
        color: var(--neutral-500);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        font-size: 0.6875rem;
        font-weight: 650;
      }

      .about {
        margin: 0;
        white-space: pre-wrap;
        color: var(--neutral-700);
      }
    }
  `;

  return [view, style];
}
